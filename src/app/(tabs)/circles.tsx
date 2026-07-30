import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorMessage, Field, PrimaryButton, SecondaryButton } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import {
  CircleNotFoundError,
  createCircle,
  createPost,
  deletePostById,
  flagPost,
  joinCircle,
  removeMember,
  setMemberRole,
  subscribeToCircleMembers,
  subscribeToPosts,
  subscribeToUserCircles,
  unflagPost,
  type UserCircle,
} from '@/lib/circles-queries';
import type { CircleMember, CircleRole, Post } from '@/lib/circles-types';

function formatRelativeTime(millis: number | null): string {
  if (millis == null) return 'just now';
  const diffSeconds = Math.max(0, Math.floor((Date.now() - millis) / 1000));
  if (diffSeconds < 60) return 'just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function QuickActionTile({
  label,
  caption,
  active,
  onPress,
}: {
  label: string;
  caption: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <ThemedView type={active ? 'accent' : 'backgroundElement'} elevated style={styles.tileInner}>
        <ThemedText type="smallBold" themeColor={active ? 'accentText' : 'text'}>
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor={active ? 'accentText' : 'textSecondary'}>
          {caption}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function CreateCircleForm({ onDone }: { onDone: (circleId: string) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const id = await createCircle(
        user.uid,
        name.trim(),
        description.trim(),
        user.displayName ?? 'Anonymous'
      );
      setCreatedId(id);
      onDone(id);
    } catch (err) {
      console.error('Create circle error', err);
      setError('Something went wrong creating the circle. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdId) {
    return (
      <View style={styles.formGap}>
        <ThemedText type="smallBold">Circle created 🎉</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Share this ID with your group so they can join it:
        </ThemedText>
        <ThemedView type="backgroundElement" elevated style={styles.idBox}>
          <ThemedText type="smallBold" selectable>
            {createdId}
          </ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.formGap}>
      <Field placeholder="Circle name" value={name} onChangeText={setName} />
      <Field
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
      />
      <ErrorMessage message={error} />
      <PrimaryButton
        label={submitting ? 'Creating...' : 'Create circle'}
        onPress={submit}
        disabled={submitting || !name.trim()}
      />
    </View>
  );
}

function JoinCircleForm({ onDone }: { onDone: (circleId: string) => void }) {
  const { user } = useAuth();
  const [circleId, setCircleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const trimmedId = circleId.trim();
      await joinCircle(user.uid, trimmedId, user.displayName ?? 'Anonymous');
      onDone(trimmedId);
    } catch (err) {
      if (err instanceof CircleNotFoundError) {
        setError("Couldn't find a circle with that ID. Double-check it and try again.");
      } else {
        console.error('Join circle error', err);
        setError('Something went wrong joining the circle. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.formGap}>
      <Field placeholder="Circle ID" value={circleId} onChangeText={setCircleId} />
      <ErrorMessage message={error} />
      <PrimaryButton
        label={submitting ? 'Joining...' : 'Join circle'}
        onPress={submit}
        disabled={submitting || !circleId.trim()}
      />
    </View>
  );
}

function PostComposer({ circleId }: { circleId: string }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user || !text.trim()) return;
    setSubmitting(true);
    try {
      await createPost(circleId, user.uid, user.displayName ?? 'Anonymous', text.trim());
      setText('');
    } catch (err) {
      console.error('Create post error', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.composer}>
      <Field
        placeholder="Share an update with your circle..."
        value={text}
        onChangeText={setText}
        multiline
      />
      <SecondaryButton label={submitting ? 'Posting...' : 'Post'} onPress={submit} disabled={submitting || !text.trim()} />
    </View>
  );
}

function MemberRow({
  member,
  isSelf,
  canManage,
  onRemove,
  onSetRole,
}: {
  member: CircleMember;
  isSelf: boolean;
  canManage: boolean;
  onRemove: () => void;
  onSetRole: (role: CircleRole) => void;
}) {
  return (
    <View style={styles.memberRow}>
      <View style={styles.memberInfo}>
        <ThemedText type="smallBold">
          {member.displayName}
          {isSelf ? ' (you)' : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {member.role === 'admin' ? 'Admin' : 'Member'}
        </ThemedText>
      </View>
      {canManage && !isSelf && (
        <View style={styles.memberActions}>
          <SecondaryButton
            label={member.role === 'admin' ? 'Make member' : 'Make admin'}
            onPress={() => onSetRole(member.role === 'admin' ? 'member' : 'admin')}
          />
          <SecondaryButton label="Remove" onPress={onRemove} />
        </View>
      )}
    </View>
  );
}

function MemberRoster({
  circleId,
  isAdmin,
  onLeave,
}: {
  circleId: string;
  isAdmin: boolean;
  onLeave: () => void;
}) {
  const { user } = useAuth();
  const [members, setMembers] = useState<CircleMember[]>([]);

  useEffect(() => {
    return subscribeToCircleMembers(circleId, setMembers);
  }, [circleId]);

  if (!user) return null;

  return (
    <ThemedView type="backgroundElement" elevated style={styles.rosterCard}>
      {members.map((member) => (
        <MemberRow
          key={member.userId}
          member={member}
          isSelf={member.userId === user.uid}
          canManage={isAdmin}
          onRemove={() => removeMember(circleId, member.userId)}
          onSetRole={(role) => setMemberRole(circleId, member.userId, role)}
        />
      ))}
      <SecondaryButton label="Leave circle" onPress={onLeave} />
    </ThemedView>
  );
}

function PostRow({
  post,
  isAdmin,
  currentUserId,
  onFlag,
  onUnflag,
  onDelete,
}: {
  post: Post;
  isAdmin: boolean;
  currentUserId: string | undefined;
  onFlag: () => void;
  onUnflag: () => void;
  onDelete: () => void;
}) {
  const isAuthor = post.authorId === currentUserId;
  const canDelete = isAuthor || isAdmin;

  return (
    <ThemedView type="backgroundElement" elevated style={styles.postRow}>
      <View style={styles.postHeader}>
        <ThemedText type="smallBold">{post.authorName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatRelativeTime(post.createdAtMillis)}
        </ThemedText>
      </View>
      <ThemedText>{post.text}</ThemedText>
      <View style={styles.postActions}>
        {post.flagged ? (
          <ThemedText type="small" themeColor="accent">
            Flagged
          </ThemedText>
        ) : (
          !isAuthor && (
            <Pressable onPress={onFlag}>
              <ThemedText type="small" themeColor="textSecondary">
                Flag
              </ThemedText>
            </Pressable>
          )
        )}
        {post.flagged && isAdmin && (
          <Pressable onPress={onUnflag}>
            <ThemedText type="small" themeColor="textSecondary">
              Unflag
            </ThemedText>
          </Pressable>
        )}
        {canDelete && (
          <Pressable onPress={onDelete}>
            <ThemedText type="small" themeColor="textSecondary">
              Remove
            </ThemedText>
          </Pressable>
        )}
      </View>
    </ThemedView>
  );
}

export default function CirclesScreen() {
  const { user, initializing } = useAuth();
  const router = useRouter();
  const [circles, setCircles] = useState<UserCircle[]>([]);
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [openAction, setOpenAction] = useState<'create' | 'join' | null>(null);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserCircles(user.uid, (nextCircles) => {
      setCircles(nextCircles);
      setActiveCircleId((current) =>
        current && nextCircles.some((c) => c.id === current) ? current : (nextCircles[0]?.id ?? null)
      );
    });
    return () => {
      unsubscribe();
      setCircles([]);
    };
  }, [user]);

  useEffect(() => {
    if (!activeCircleId) return;
    const unsubscribe = subscribeToPosts(activeCircleId, setPosts);
    return () => {
      unsubscribe();
      setPosts([]);
    };
  }, [activeCircleId]);

  const activeCircle = useMemo(
    () => circles.find((c) => c.id === activeCircleId) ?? null,
    [circles, activeCircleId]
  );

  if (initializing) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ActivityIndicator style={styles.loading} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <ThemedText type="title" style={styles.title}>
            Circles
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.description}>
            Sign in to join or create a circle with your group.
          </ThemedText>
          <SecondaryButton label="Go to Profile" onPress={() => router.push('/profile')} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title" style={styles.title}>
          Circles
        </ThemedText>

        <View style={styles.tileRow}>
          <QuickActionTile
            label="Create"
            caption="Start a circle"
            active={openAction === 'create'}
            onPress={() => setOpenAction(openAction === 'create' ? null : 'create')}
          />
          <QuickActionTile
            label="Join"
            caption="Have an ID?"
            active={openAction === 'join'}
            onPress={() => setOpenAction(openAction === 'join' ? null : 'join')}
          />
        </View>

        {openAction === 'create' && (
          <CreateCircleForm
            onDone={(id) => {
              setActiveCircleId(id);
            }}
          />
        )}
        {openAction === 'join' && (
          <JoinCircleForm
            onDone={(id) => {
              setActiveCircleId(id);
              setOpenAction(null);
            }}
          />
        )}

        {circles.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.description}>
            You&apos;re not in any circles yet. Create one, or join one with an ID someone shared
            with you.
          </ThemedText>
        ) : (
          <>
            <FlatList
              horizontal
              style={styles.circleChipRow}
              data={circles}
              keyExtractor={(c) => c.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable onPress={() => setActiveCircleId(item.id)}>
                  <ThemedView
                    type={item.id === activeCircleId ? 'accent' : 'backgroundElement'}
                    style={styles.chip}>
                    <ThemedText
                      type="smallBold"
                      themeColor={item.id === activeCircleId ? 'accentText' : 'text'}>
                      {item.name}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              )}
            />

            {activeCircle && (
              <Pressable onPress={() => setShowMembers((v) => !v)}>
                <ThemedText type="small" themeColor="accent">
                  {showMembers ? 'Hide members' : 'Members'}
                </ThemedText>
              </Pressable>
            )}

            {activeCircle && showMembers && (
              <MemberRoster
                circleId={activeCircle.id}
                isAdmin={activeCircle.role === 'admin'}
                onLeave={async () => {
                  if (!user) return;
                  await removeMember(activeCircle.id, user.uid);
                  setShowMembers(false);
                }}
              />
            )}

            {activeCircle && <PostComposer circleId={activeCircle.id} />}

            <FlatList
              style={styles.feed}
              contentContainerStyle={styles.feedContent}
              data={posts}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <PostRow
                  post={item}
                  isAdmin={activeCircle?.role === 'admin'}
                  currentUserId={user?.uid}
                  onFlag={() => flagPost(item.id)}
                  onUnflag={() => unflagPost(item.id)}
                  onDelete={() => deletePostById(item.id)}
                />
              )}
              ListEmptyComponent={
                <ThemedText themeColor="textSecondary" style={styles.description}>
                  No posts yet. Be the first to share something with this circle.
                </ThemedText>
              }
            />
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  description: {
    lineHeight: 22,
  },
  loading: {
    marginTop: Spacing.five,
  },
  tileRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  tile: {
    flex: 1,
  },
  tileInner: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  formGap: {
    gap: Spacing.two,
  },
  idBox: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  circleChipRow: {
    flexGrow: 0,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    marginRight: Spacing.two,
  },
  composer: {
    gap: Spacing.two,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  postRow: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  postActions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.half,
  },
  rosterCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  memberInfo: {
    gap: Spacing.half,
  },
  memberActions: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
});

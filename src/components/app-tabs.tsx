import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundSelected}
      labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="index">
        <Label>Read</Label>
        <Icon
          sf={{ default: 'book.closed', selected: 'book.closed.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="menu-book" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <Label>Search</Label>
        <Icon sf="magnifyingglass" androidSrc={<VectorIcon family={MaterialIcons} name="search" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="circles">
        <Label>Circles</Label>
        <Icon
          sf={{ default: 'person.3', selected: 'person.3.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="groups" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="notes">
        <Label>Notes</Label>
        <Icon
          sf="square.and.pencil"
          androidSrc={<VectorIcon family={MaterialIcons} name="edit-note" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="account-circle" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

import { AppShell, Burger, Group, Center, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet } from '@tanstack/react-router';
import Header from '../components/layout/Header';
import { useAuthStore } from '../store/authStore';

export function MainLayout() {
  console.log('[MainLayout] Rendering...');
  const [opened, { toggle }] = useDisclosure();
  const isInitialized = useAuthStore((state) => state.isInitialized);
  console.log('[MainLayout] isInitialized state:', isInitialized);

  if (!isInitialized) {
    console.log('[MainLayout] Showing "Initializing Authentication..."');
    return (
      <Center style={{ height: '100vh' }}>
         <Text>Initializing Authentication...</Text>
      </Center>
    );
  }

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header>
         <Group h="100%" px="md">
           <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
           <Header />
         </Group>
      </AppShell.Header>


      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
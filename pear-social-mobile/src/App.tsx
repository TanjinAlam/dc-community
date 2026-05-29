import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { P2PProvider } from './contexts/P2PContext';
import SetupScreen from './screens/SetupScreen';
import MainScreen from './screens/MainScreen';
import CommunitiesScreen from './screens/CommunitiesScreen';
import CommunityFeedScreen from './screens/CommunityFeedScreen';
import CommentScreen from './screens/CommentScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import ChatListScreen from './screens/ChatListScreen';
import ConversationScreen from './screens/ConversationScreen';
import IncomingCallScreen from './screens/IncomingCallScreen';
import CallScreen from './screens/CallScreen';
import * as p2p from './p2p/index';

const Stack = createStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    p2p.init('pear-social-data').then(() => {
      setReady(true);
      p2p.onIncomingCall((call) => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('IncomingCall' as never, call as never);
        }
      });
    });
  }, []);

  if (!ready) return null;

  return (
    <P2PProvider>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator initialRouteName="Setup" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Setup" component={SetupScreen} />
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen name="Communities" component={CommunitiesScreen} />
            <Stack.Screen name="CommunityFeed" component={CommunityFeedScreen} />
            <Stack.Screen name="Comments" component={CommentScreen} />
            <Stack.Screen name="Discover" component={DiscoverScreen} />
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen
              name="Conversation"
              component={ConversationScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#1e1b4b' },
                headerTintColor: '#fff',
                headerTitle: 'Chat',
              }}
            />
            <Stack.Screen name="IncomingCall" component={IncomingCallScreen} options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="ActiveCall" component={CallScreen} options={{ headerShown: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </P2PProvider>
  );
}

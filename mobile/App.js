import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import SorteioScreen from './screens/SorteioScreen';
import ListaScreen from './screens/ListaScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          tabBarStyle: {
            backgroundColor: '#1a1a1a',
            borderTopColor: '#333',
          },
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: '#999',
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Confirmar Presença',
            tabBarLabel: 'Confirmar',
          }}
        />
        <Tab.Screen
          name="Lista"
          component={ListaScreen}
          options={{
            title: 'Lista de Confirmados',
            tabBarLabel: 'Lista',
          }}
        />
        <Tab.Screen
          name="Sorteio"
          component={SorteioScreen}
          options={{
            title: 'Sorteio dos Times',
            tabBarLabel: 'Sorteio',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

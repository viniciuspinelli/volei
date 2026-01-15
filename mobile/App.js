import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();

function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📝 Confirmar Presença</Text>
      <Text style={styles.text}>Em desenvolvimento...</Text>
    </View>
  );
}

function ListaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 Lista de Confirmados</Text>
      <Text style={styles.text}>Em desenvolvimento...</Text>
    </View>
  );
}

function SorteioScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎲 Sorteio dos Times</Text>
      <Text style={styles.text}>Em desenvolvimento...</Text>
    </View>
  );
}

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
            title: 'Confirmar',
            tabBarLabel: 'Confirmar',
          }}
        />
        <Tab.Screen
          name="Lista"
          component={ListaScreen}
          options={{
            title: 'Lista',
            tabBarLabel: 'Lista',
          }}
        />
        <Tab.Screen
          name="Sorteio"
          component={SorteioScreen}
          options={{
            title: 'Sorteio',
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
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    color: '#aaa',
    fontSize: 16,
  },
});

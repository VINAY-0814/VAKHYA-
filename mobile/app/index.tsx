import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2DD4BF" />
      </View>
    );
  }

  return <Redirect href={user ? "/(tabs)/calls" : "/(auth)/welcome"} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#0B1F24",
    justifyContent: "center",
    alignItems: "center",
  },
});

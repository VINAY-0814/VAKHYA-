import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

interface BrandHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export function BrandHeader({ title, subtitle, rightSlot }: BrandHeaderProps) {
  return (
    <View style={styles.container} accessible accessibilityRole="header">
      <View style={styles.left}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          accessibilityLabel="VAKHYA application logo"
        />
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightSlot ? <View>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#0F2930",
    borderBottomWidth: 1,
    borderBottomColor: "#1E3E47",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: "#5EEAD4",
    fontSize: 12,
    fontWeight: "500",
  },
});

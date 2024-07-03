import { Slot, Tabs } from "expo-router";
import React, { PropsWithChildren } from "react";

import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Text, View } from "react-native";

export default function TabLayout(props: PropsWithChildren) {
  const colorScheme = useColorScheme();

  return <Slot />;
}

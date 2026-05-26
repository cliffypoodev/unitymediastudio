import React, { useState } from "react";
import { View, Pressable, Text, Dimensions } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { STUDIO } from "../utils/theme";
import { FloatingAIAssistant } from "./FloatingAIAssistant";

const { width } = Dimensions.get("window");

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const handleAIButtonPress = () => {
    // No haptics on web
    setShowAIAssistant(true);
  };

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: STUDIO.dark,
          borderTopWidth: 1,
          borderTopColor: STUDIO.border,
          paddingTop: 8,
          paddingBottom: 24,
          height: 88,
          alignItems: "center",
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              // No haptics on web
              navigation.navigate(route.name);
            }
          };

          const icon = options.tabBarIcon
            ? options.tabBarIcon({
                focused: isFocused,
                color: isFocused ? STUDIO.amber : STUDIO.nickelDark,
                size: 24,
              })
            : null;

          // Insert AI button between Images (index 1) and Video (index 2)
          if (index === 2) {
            return (
              <React.Fragment key={route.key}>
                {/* AI Assistant Button */}
                <View
                  style={{
                    flex: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    marginHorizontal: 8,
                  }}
                >
                  <Pressable onPress={handleAIButtonPress}>
                    {({ pressed }) => (
                      <LinearGradient
                        colors={[STUDIO.swirlBlue, STUDIO.swirlCyan] as readonly [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          opacity: pressed ? 0.8 : 1,
                        }}
                      >
                        <Ionicons name="sparkles" size={28} color="#FFFFFF" />
                      </LinearGradient>
                    )}
                  </Pressable>
                </View>

                {/* Current Tab Button (Video) */}
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 4,
                  }}
                >
                  {icon}
                  <Text
                    style={{
                      color: isFocused ? STUDIO.amber : STUDIO.nickelDark,
                      fontWeight: "600",
                      fontSize: 11,
                      marginTop: 4,
                      letterSpacing: 0.5,
                    }}
                  >
                    {route.name}
                  </Text>
                </Pressable>
              </React.Fragment>
            );
          }

          // Regular tab button
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 4,
              }}
            >
              {icon}
              <Text
                style={{
                  color: isFocused ? STUDIO.amber : STUDIO.nickelDark,
                  fontWeight: "600",
                  fontSize: 11,
                  marginTop: 4,
                  letterSpacing: 0.5,
                }}
              >
                {route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <FloatingAIAssistant
          isExpanded={showAIAssistant}
          onClose={() => setShowAIAssistant(false)}
        />
      )}
    </>
  );
}

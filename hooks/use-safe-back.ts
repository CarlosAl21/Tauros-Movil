import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";

/**
 * Back navigation that always returns to the screen the user came from.
 *
 * - With history: pops the stack (`router.back()`), exactly what the iOS
 *   swipe-back gesture and the Android hardware back do natively, so the
 *   header button and the system back stay consistent.
 * - Without history (deep link, cold start on a detail screen): goes to the
 *   logical parent given by `fallback` instead of leaving the app or jumping
 *   to an unrelated section.
 *
 * Returns the handler to wire to the header back button. On Android it also
 * intercepts the hardware back, but only when there is no history to pop.
 */
export function useSafeBack(fallback: Href) {
  const router = useRouter();
  const fallbackRef = useRef(fallback);

  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackRef.current);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return undefined;
      }

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (router.canGoBack()) {
            return false;
          }

          router.replace(fallbackRef.current);
          return true;
        },
      );

      return () => subscription.remove();
    }, [router]),
  );

  return goBack;
}

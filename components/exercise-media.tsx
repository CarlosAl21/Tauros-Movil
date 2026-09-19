import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { EXERCISE_MEDIA_ASPECT_RATIO } from "@/lib/cloudinary";

const VideoViewComponent = VideoView as unknown as ComponentType<{
  player: ReturnType<typeof useVideoPlayer>;
  style: object;
  nativeControls?: boolean;
  contentFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
}>;

type ExerciseMediaProps = {
  /** Video/GIF-as-video URL. When empty, the fallback image is shown. */
  source?: string;
  /** Still image shown when there is no video or it fails to load. */
  fallback?: string;
  /** Loop and play the clip (detail screen) or keep it paused (list cards). */
  autoPlay?: boolean;
  /** Show a play glyph over a paused clip. */
  showPlayOverlay?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Container for every exercise clip/image. All exercise media is square
 * (180x180), so the box is a fixed 1:1 and the content is fitted with
 * `contain`: the whole figure is always visible and any letterboxing blends
 * into the neutral background.
 */
export function ExerciseMedia({
  source,
  fallback,
  autoPlay = false,
  showPlayOverlay = false,
  style,
}: ExerciseMediaProps) {
  return (
    <View style={[styles.frame, style]}>
      {source ? (
        <ExerciseVideoPlayer
          source={source}
          fallback={fallback}
          autoPlay={autoPlay}
          showPlayOverlay={showPlayOverlay}
        />
      ) : (
        <FallbackImage uri={fallback} />
      )}
    </View>
  );
}

function FallbackImage({ uri }: { uri?: string }) {
  if (!uri) {
    return null;
  }

  return (
    <Image
      source={{ uri }}
      style={styles.fill}
      contentFit="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

function ExerciseVideoPlayer({
  source,
  fallback,
  autoPlay,
  showPlayOverlay,
}: {
  source: string;
  fallback?: string;
  autoPlay: boolean;
  showPlayOverlay: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.muted = true;
    if (autoPlay) {
      videoPlayer.loop = true;
      videoPlayer.play();
    } else {
      videoPlayer.pause();
    }
  });

  useEffect(() => {
    setHasError(false);
    const subscription = player.addListener("statusChange", (payload) => {
      if (payload.status === "error") {
        console.warn("[ExerciseMedia] failed to load", source, payload.error);
        setHasError(true);
      }
    });

    return () => subscription.remove();
  }, [player, source]);

  if (hasError) {
    return <FallbackImage uri={fallback} />;
  }

  return (
    <>
      <VideoViewComponent
        player={player}
        style={styles.fill}
        nativeControls={false}
        contentFit="contain"
      />
      {showPlayOverlay && !autoPlay ? (
        <View pointerEvents="none" style={styles.overlay}>
          <MaterialCommunityIcons
            name="play-circle-outline"
            size={42}
            color="#ffffff"
          />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    // Keeps the card a sensible size on tablets (iPad) instead of a huge square.
    maxWidth: 520,
    alignSelf: "center",
    aspectRatio: EXERCISE_MEDIA_ASPECT_RATIO,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
  },
  fill: { width: "100%", height: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.16)",
  },
});

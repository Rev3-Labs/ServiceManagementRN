import React, {useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {Icon} from './Icon';

interface SignatureCanvasProps {
  onOK?: (signature: string) => void;
  onEmpty?: () => void;
  onClear?: () => void;
  penColor?: string;
  strokeWidth?: number;
}

const SignatureCanvas = React.forwardRef<any, SignatureCanvasProps>(
  ({onOK, onEmpty, onClear}, ref) => {
    const [hasDrawn, setHasDrawn] = useState(false);
    const [touchPoints, setTouchPoints] = useState<
      Array<{x: number; y: number}>
    >([]);

    const handleTouch = useCallback(
      (event: any) => {
        setHasDrawn(true);
        const {locationX, locationY} = event.nativeEvent;
        setTouchPoints((prev) => [...prev, {x: locationX, y: locationY}]);
      },
      [],
    );

    const clearSignature = useCallback(() => {
      setHasDrawn(false);
      setTouchPoints([]);
      onClear?.();
    }, [onClear]);

    const readSignature = useCallback(() => {
      if (!hasDrawn) {
        onEmpty?.();
      } else {
        // Generate a simple signature data with timestamp
        const signatureData = `signature_${Date.now()}`;
        onOK?.(signatureData);
      }
    }, [hasDrawn, onEmpty, onOK]);

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      clearSignature,
      readSignature,
    }));

    const {width} = Dimensions.get('window');
    const canvasWidth = Math.min(width - 80, 600);
    const canvasHeight = 250;

    return (
      <View
        style={[styles.container, {width: canvasWidth, height: canvasHeight}]}
        onStartShouldSetResponder={() => true}
        onResponderMove={handleTouch}>
        {!hasDrawn && (
          <Text style={styles.placeholder}>
            Touch and drag to sign
          </Text>
        )}
        {touchPoints.map((point, index) => (
          <View
            key={`point-${index}`}
            style={[
              styles.dot,
              {
                left: point.x - 2,
                top: point.y - 2,
              },
            ]}
          />
        ))}
        {hasDrawn && touchPoints.length === 0 && (
          <View style={styles.signedIndicator}>
            <Icon name="check" size={18} color="#65B230" style={styles.signedIcon} />
            <Text style={styles.signedText}>Signature Area</Text>
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeholder: {
    color: '#999',
    fontSize: 16,
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
  },
  signedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 20,
  },
  signedIcon: {
    marginRight: 4,
  },
  signedText: {
    color: '#65B230',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SignatureCanvas;

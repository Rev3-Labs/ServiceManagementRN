import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

/**
 * Web implementation of react-native-signature-canvas.
 * Uses a real HTML <canvas> so users can draw with mouse or touch and
 * export a PNG data URI via onOK — matching the native library API.
 */
const SignatureCanvas = forwardRef(function SignatureCanvas(
  {
    onOK,
    onEmpty,
    onClear,
    onBegin,
    onEnd,
    descriptionText = 'Sign above',
    clearText = 'Clear',
    confirmText = 'Save',
    penColor = '#111111',
    backgroundColor = '#FFFFFF',
    style,
    ..._rest
  },
  ref,
) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [canvasSize, setCanvasSize] = useState({width: 0, height: 0});

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    setHasInk(false);
    onClear?.();
  }, [backgroundColor, onClear]);

  const readSignature = useCallback(() => {
    if (!hasInkRef.current) {
      onEmpty?.();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      onEmpty?.();
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    onOK?.(dataUrl);
  }, [onEmpty, onOK]);

  useImperativeHandle(
    ref,
    () => ({
      clearSignature: clearCanvas,
      readSignature,
    }),
    [clearCanvas, readSignature],
  );

  // Size the backing store for device pixel ratio so strokes stay sharp.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width <= 0 || canvasSize.height <= 0) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(canvasSize.width * dpr);
    canvas.height = Math.floor(canvasSize.height * dpr);
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    hasInkRef.current = false;
    setHasInk(false);
  }, [canvasSize.width, canvasSize.height, penColor, backgroundColor]);

  const getPoint = useCallback(event => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    // Prefer pointer/mouse client coords; fall back to touches.
    const native = event.nativeEvent || event;
    let clientX;
    let clientY;
    if (native.touches && native.touches.length > 0) {
      clientX = native.touches[0].clientX;
      clientY = native.touches[0].clientY;
    } else if (native.changedTouches && native.changedTouches.length > 0) {
      clientX = native.changedTouches[0].clientX;
      clientY = native.changedTouches[0].clientY;
    } else {
      clientX = native.clientX;
      clientY = native.clientY;
    }

    if (clientX == null || clientY == null) return null;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const startStroke = useCallback(
    event => {
      const point = getPoint(event);
      if (!point) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      event.preventDefault?.();
      drawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      onBegin?.();
    },
    [getPoint, onBegin],
  );

  const moveStroke = useCallback(
    event => {
      if (!drawingRef.current) return;
      const point = getPoint(event);
      if (!point) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      event.preventDefault?.();
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      if (!hasInkRef.current) {
        hasInkRef.current = true;
        setHasInk(true);
      }
    },
    [getPoint],
  );

  const endStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onEnd?.();
  }, [onEnd]);

  // Attach native DOM listeners so preventDefault works for touch scrolling.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const opts = {passive: false};
    const onPointerDown = e => startStroke(e);
    const onPointerMove = e => moveStroke(e);
    const onPointerUp = () => endStroke();
    const onPointerLeave = () => endStroke();

    canvas.addEventListener('pointerdown', onPointerDown, opts);
    canvas.addEventListener('pointermove', onPointerMove, opts);
    canvas.addEventListener('pointerup', onPointerUp, opts);
    canvas.addEventListener('pointerleave', onPointerLeave, opts);
    canvas.addEventListener('pointercancel', onPointerUp, opts);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [startStroke, moveStroke, endStroke, canvasSize.width, canvasSize.height]);

  const handleLayout = event => {
    const {width, height} = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCanvasSize(prev =>
        prev.width === width && prev.height === height
          ? prev
          : {width, height},
      );
    }
  };

  // react-native-web: render a real <canvas> via createElement.
  const canvasElement =
    Platform.OS === 'web'
      ? React.createElement('canvas', {
          ref: canvasRef,
          style: {
            width: '100%',
            height: '100%',
            display: 'block',
            touchAction: 'none',
            cursor: 'crosshair',
            backgroundColor,
          },
        })
      : null;

  return (
    <View style={[styles.container, style]}>
      {descriptionText ? (
        <Text style={styles.description}>{descriptionText}</Text>
      ) : null}

      <View
        ref={containerRef}
        style={styles.canvasArea}
        onLayout={handleLayout}>
        {canvasElement}
        {!hasInk && canvasSize.width > 0 ? (
          <View style={styles.placeholderOverlay} pointerEvents="none">
            <Text style={styles.placeholderText}>
              Draw your signature here
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearCanvas}
          accessibilityRole="button"
          accessibilityLabel={clearText}>
          <Text style={styles.buttonText}>{clearText}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={readSignature}
          accessibilityRole="button"
          accessibilityLabel={confirmText}>
          <Text style={styles.buttonText}>{confirmText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  canvasArea: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    position: 'relative',
    minHeight: 220,
  },
  placeholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 16,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#dc2626',
  },
  saveButton: {
    backgroundColor: '#65B230',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SignatureCanvas;

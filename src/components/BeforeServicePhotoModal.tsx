import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  launchCamera,
  ImagePickerResponse,
  CameraOptions,
} from 'react-native-image-picker';
import {Button} from './Button';
import {Icon} from './Icon';
import {photoService} from '../services/photoService';
import {colors, spacing, typography, borderRadius} from '../styles/theme';

interface BeforeServicePhotoModalProps {
  visible: boolean;
  orderNumber: string;
  onPhotoCaptured: () => void;
  onCancel: () => void;
}

type CaptureStatus = 'opening' | 'preview' | 'retry' | 'saving';

export const BeforeServicePhotoModal: React.FC<BeforeServicePhotoModalProps> = ({
  visible,
  orderNumber,
  onPhotoCaptured,
  onCancel,
}) => {
  const [status, setStatus] = useState<CaptureStatus>('opening');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cameraSessionRef = useRef(0);
  const webContainerRef = useRef<View | null>(null);
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const webStreamRef = useRef<MediaStream | null>(null);

  const stopWebCamera = useCallback(() => {
    webStreamRef.current?.getTracks().forEach(track => track.stop());
    webStreamRef.current = null;
    webVideoRef.current = null;
    const container = webContainerRef.current as unknown as HTMLElement | null;
    if (container) {
      container.innerHTML = '';
    }
  }, []);

  const savePhoto = useCallback(
    async (uri: string) => {
      setStatus('saving');
      setErrorMessage(null);
      try {
        await photoService.addPhoto(orderNumber, uri, 'before-service');
        stopWebCamera();
        onPhotoCaptured();
      } catch {
        setErrorMessage('Failed to save photo. Please try again.');
        setStatus('retry');
      }
    },
    [orderNumber, onPhotoCaptured, stopWebCamera],
  );

  const openNativeCamera = useCallback(() => {
    const session = ++cameraSessionRef.current;
    setStatus('opening');
    setErrorMessage(null);

    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
      saveToPhotos: false,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (session !== cameraSessionRef.current) {
        return;
      }
      if (response.didCancel) {
        setErrorMessage('A before-service photo is required to start work.');
        setStatus('retry');
        return;
      }
      if (response.errorCode) {
        setErrorMessage('Failed to open camera. Please try again.');
        setStatus('retry');
        return;
      }

      const uri = response.assets?.[0]?.uri;
      if (uri) {
        void savePhoto(uri);
      } else {
        setErrorMessage('No photo captured. Please try again.');
        setStatus('retry');
      }
    });
  }, [savePhoto]);

  const startWebCamera = useCallback(async () => {
    const session = ++cameraSessionRef.current;
    setStatus('opening');
    setErrorMessage(null);
    stopWebCamera();

    try {
      // @ts-ignore - mediaDevices is available in modern browsers
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera unavailable');
      }

      const container = webContainerRef.current as unknown as HTMLElement | null;
      if (!container) {
        throw new Error('Camera preview unavailable');
      }

      // @ts-ignore
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: {ideal: 1920},
          height: {ideal: 1080},
        },
      });

      if (session !== cameraSessionRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      webStreamRef.current = stream;

      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.borderRadius = `${borderRadius.lg}px`;
      video.srcObject = stream;
      container.appendChild(video);
      webVideoRef.current = video;
      setStatus('preview');
    } catch {
      if (session === cameraSessionRef.current) {
        setErrorMessage('Camera access denied or unavailable.');
        setStatus('retry');
      }
    }
  }, [stopWebCamera]);

  const captureWebPhoto = useCallback(() => {
    const video = webVideoRef.current;
    if (!video || video.videoWidth === 0) {
      setErrorMessage('Camera is not ready. Please try again.');
      setStatus('retry');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setErrorMessage('Failed to capture photo. Please try again.');
      setStatus('retry');
      return;
    }
    ctx.drawImage(video, 0, 0);
    void savePhoto(canvas.toDataURL('image/jpeg', 0.8));
  }, [savePhoto]);

  const beginCapture = useCallback(() => {
    if (Platform.OS === 'web') {
      void startWebCamera();
      return;
    }
    openNativeCamera();
  }, [openNativeCamera, startWebCamera]);

  useEffect(() => {
    if (!visible) {
      cameraSessionRef.current += 1;
      stopWebCamera();
      setStatus('opening');
      setErrorMessage(null);
      return;
    }

    const timer = setTimeout(beginCapture, 250);
    return () => clearTimeout(timer);
  }, [visible, orderNumber, beginCapture, stopWebCamera]);

  const showWebPreview = Platform.OS === 'web' && status === 'preview';
  const showRetry = status === 'retry';
  const showSaving = status === 'saving';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {}}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Icon name="camera-alt" size={28} color={colors.primary} />
          <Text style={styles.title}>Before Service Photo Required</Text>
          <Text style={styles.subtitle}>
            Capture a photo of the work area before beginning service tasks.
          </Text>
        </View>

        {Platform.OS === 'web' && (
          <View
            ref={webContainerRef}
            style={[
              styles.webPreviewContainer,
              !showWebPreview && styles.webPreviewHidden,
            ]}
          />
        )}

        {status === 'opening' && !showRetry && (
          <View style={styles.statusBlock}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.statusText}>Opening camera...</Text>
          </View>
        )}

        {showSaving && (
          <View style={styles.statusBlock}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.statusText}>Saving photo...</Text>
          </View>
        )}

        {showRetry && errorMessage && (
          <View style={styles.errorBlock}>
            <Icon name="warning" size={24} color={colors.warning} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.actions}>
          {showWebPreview && (
            <Button
              title="Capture Photo"
              variant="primary"
              size="lg"
              fullWidth
              onPress={captureWebPhoto}
            />
          )}
          {showRetry && (
            <Button
              title="Open Camera"
              variant="primary"
              size="lg"
              fullWidth
              onPress={beginCapture}
            />
          )}
          <Button
            title="Cancel Start"
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => {
              cameraSessionRef.current += 1;
              stopWebCamera();
              onCancel();
            }}
            disabled={showSaving}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 420,
  },
  webPreviewContainer: {
    flex: 1,
    marginVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    minHeight: 280,
  },
  webPreviewHidden: {
    opacity: 0,
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
  },
  statusBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  statusText: {
    ...typography.base,
    color: colors.mutedForeground,
  },
  errorBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    ...typography.base,
    color: colors.foreground,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
});

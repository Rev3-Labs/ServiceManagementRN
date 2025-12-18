import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

// Web mock for react-native-signature-canvas
// Provides a basic fallback UI for web platform
const SignatureCanvas = ({
  onOK,
  onEmpty,
  onClear,
  descriptionText = 'Sign above',
  clearText = 'Clear',
  confirmText = 'Save',
  style,
  ...props
}) => {
  const [hasSignature, setHasSignature] = useState(false);

  const handleClear = () => {
    setHasSignature(false);
    if (onClear) {
      onClear();
    }
  };

  const handleSave = () => {
    if (!hasSignature) {
      if (onEmpty) {
        onEmpty();
      }
      return;
    }
    // Generate a placeholder base64 image (1x1 transparent PNG)
    const placeholderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    if (onOK) {
      onOK(placeholderBase64);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.canvasArea}>
        <Text style={styles.description}>{descriptionText}</Text>
        <View style={styles.canvasPlaceholder}>
          {hasSignature ? (
            <>
              <Text style={styles.signatureIndicator}>✓ Signature Simulated</Text>
              <Text style={styles.signatureSubtext}>
                Click "Clear" to remove or "Save" to continue
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.placeholderText}>
                Signature canvas is not available on web platform.{'\n'}
                Please use a native device (Android/iOS) to sign manifests.
              </Text>
              <TouchableOpacity
                style={styles.simulateButton}
                onPress={() => setHasSignature(true)}>
                <Text style={styles.simulateButtonText}>Simulate Signature (for testing)</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClear}>
          <Text style={styles.buttonText}>{clearText}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}>
          <Text style={styles.buttonText}>{confirmText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  canvasArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  canvasPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },
  signatureIndicator: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  signatureSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  simulateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  simulateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
    backgroundColor: '#ef4444',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SignatureCanvas;











import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

// Web mock for react-native-webview
// This provides a basic fallback for web platform
const WebView = ({source, style, onMessage, onLoadEnd, ...props}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.placeholder}>
        WebView is not supported on web platform.
        {source?.uri && `\nURL: ${source.uri}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  placeholder: {
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
});

export default WebView;











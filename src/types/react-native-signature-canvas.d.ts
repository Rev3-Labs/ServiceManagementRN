declare module 'react-native-signature-canvas' {
  import {Component} from 'react';
  import {StyleProp, ViewStyle} from 'react-native';

  export interface SignatureCanvasProps {
    onOK?: (signature: string) => void;
    onEmpty?: () => void;
    onClear?: () => void;
    onGetData?: (data: string) => void;
    descriptionText?: string;
    clearText?: string;
    confirmText?: string;
    webStyle?: string;
    autoClear?: boolean;
    imageType?: string;
    dataURL?: string;
    trimWhitespace?: boolean;
    backgroundColor?: string;
    penColor?: string;
    minWidth?: number;
    maxWidth?: number;
    dotSize?: number;
    style?: StyleProp<ViewStyle>;
  }

  export default class SignatureCanvas extends Component<SignatureCanvasProps> {}
}

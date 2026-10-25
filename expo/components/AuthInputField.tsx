// The auth form's text field, shared by the login/signup form and the
// emailed-code steps.
import React, { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

export interface InputFieldProps {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: TextInput['props']['keyboardType'];
  autoCapitalize?: TextInput['props']['autoCapitalize'];
  inputBg: string;
  inputBorder: string;
  inputFocusBorder: string;
  textColor: string;
  placeholderColor: string;
  testID?: string;
  rightIcon?: React.ReactNode;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  maxLength?: number;
  editable?: boolean;
}

export function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  inputBg,
  inputBorder,
  inputFocusBorder,
  textColor,
  placeholderColor,
  testID,
  rightIcon,
  autoComplete,
  textContentType,
  maxLength,
  editable,
}: InputFieldProps) {
  const [focused, setFocused] = useState<boolean>(false);

  return (
    <View
      style={[
        styles.inputWrap,
        { backgroundColor: inputBg, borderColor: focused ? inputFocusBorder : inputBorder },
      ]}
    >
      <View style={styles.inputIcon}>{icon}</View>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={testID}
        autoComplete={autoComplete}
        textContentType={textContentType}
        maxLength={maxLength}
        editable={editable}
      />
      {rightIcon && <View style={styles.inputRight}>{rightIcon}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    height: '100%' as unknown as number,
  },
  inputRight: {
    marginLeft: 8,
  },
});

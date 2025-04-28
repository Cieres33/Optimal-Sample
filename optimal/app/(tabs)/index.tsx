import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Provider as PaperProvider, Button, TextInput, Text, Card, DefaultTheme } from 'react-native-paper';

const App = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [inputs, setInputs] = useState({
    part1: '',
    part2: '',
    part3: '',
    part4: '',
    part5: ''
  });
  const customTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#2196F3',      // 聚焦时边框颜色
      text: '#37474F',         // 输入文字颜色
      placeholder: '#BDBDBD',  // 占位符颜色
      background: '#FFFFFF',   // 输入框背景色
      surface: '#F5F5F5'       // 未聚焦边框颜色（需要特殊处理）
    },
  };

  const toggleMode = () => {
    //TODO  更改模式
    setIsVisible(!isVisible);}

  const handleInputChange = (text: string, part: string) => {
    setInputs(prev => ({
      ...prev,
      [part]: text
    }));
  };

  return (
    <PaperProvider theme={customTheme}>
      <View style={styles.container}>
        {/* 显示/隐藏控制按钮 */}
        <Button 
          mode="contained" 
          onPress={toggleMode}
          style={styles.button}
        >
          {isVisible ? 'custom' : 'random'}
        </Button>

        {/* 输入框组 */}
        {isVisible && (
          <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                style={styles.shortInput}
                placeholder="m"
                maxLength={3}
                value={inputs.part1}
                onChangeText={(t: string) => handleInputChange(t, 'part1')}
              />
              <Text style={styles.dash}>-</Text>
              <TextInput
                mode="outlined"
                style={styles.shortInput}
                placeholder="n"
                maxLength={3}
                value={inputs.part2}
                onChangeText={t => handleInputChange(t, 'part2')}
              />
              <Text style={styles.dash}>-</Text>
              <TextInput
                mode="outlined"
                style={styles.shortInput}
                placeholder="k"
                maxLength={3}
                value={inputs.part3}
                onChangeText={t => handleInputChange(t, 'part3')}
              />
              <Text style={styles.dash}>-</Text>
              <TextInput
                mode="outlined"
                style={styles.shortInput}
                placeholder="j"
                maxLength={4}
                value={inputs.part4}
                onChangeText={t => handleInputChange(t, 'part4')}
              />
              <Text style={styles.dash}>-</Text>
              <TextInput
                mode="outlined"
                style={styles.shortInput}
                placeholder="s"
                maxLength={5}
                value={inputs.part5}
                onChangeText={t => handleInputChange(t, 'part5')}
              />
          </View>
        )}

        {/* execute */}
        <Button 
          mode="contained" 
          style={[styles.button, styles.executeButton]}
          onPress={() =>([])}
        >
          execute
        </Button>
      </View>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 300
  },
  button: {
    marginBottom: 20,
    width: 200
  },
  executeButton: {
    backgroundColor: '#CCCCCC',
    marginTop: 30
  },
  inputGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap', // 允许换行
    justifyContent: 'center',
    padding: 10
  },
  shortInput: {
    width: 40,
    height: 40,
    textAlignVertical: 'center', // 垂直居中（Android）
    paddingVertical: 0           // 清除默认垂直 padding
  },
  dash: {
    fontSize: 20,
    lineHeight: 40,
    marginHorizontal: 5
  }
});

export default App;
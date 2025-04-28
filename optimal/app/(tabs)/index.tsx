// optimal/app/(tabs)/index.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Provider as PaperProvider,
  Button,
  TextInput,
  Text,
  Card,
  DefaultTheme,
  List,
} from 'react-native-paper';

import {
  runOptimalAlgorithm,
  validateParams,
  randomParams,
} from '../services/optimalService';

import { Params, Result } from '../../src/optimal';

export default function App() {
  /* ------- UI 状态 ------- */
  const [isCustom, setIsCustom] = useState(false);
  const [form, setForm] = useState({
    m: '45',
    n: '8',
    k: '6',
    j: '4',
    s: '4',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<Result | null>(null);

  /* ------- 主题 ------- */
  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, primary: '#2196F3' },
  };

  /* ------- 处理函数 ------- */
  const setField = (key: keyof typeof form, value: string) => {
    if (/^\d*$/.test(value)) setForm(f => ({ ...f, [key]: value }));
  };

  /** 点击 EXECUTE */
  const onExecute = async () => {
    setError(null);
    setResult(null);

    /* 1. 收集 / 生成参数 ------------------------------------ */
    let params: Params;
    if (isCustom) {
      params = {
        m: parseInt(form.m, 10),
        n: parseInt(form.n, 10),
        k: parseInt(form.k, 10),
        j: parseInt(form.j, 10),
        s: parseInt(form.s, 10),
      };
    } else {
      params = randomParams();
      setForm({
        m: params.m.toString(),
        n: params.n.toString(),
        k: params.k.toString(),
        j: params.j.toString(),
        s: params.s.toString(),
      });
    }

    /* 2. 校验 ---------------------------------------------- */
    const err = validateParams(params);
    if (err) { setError(err); return; }

    /* 3. 调用算法 ----------------------------------------- */
    try {
      setLoading(true);
      const r = await runOptimalAlgorithm(params);
      setResult(r);
    } catch (e: any) {
      setError(e.message || '执行失败');
    } finally {
      setLoading(false);
    }
  };

  /* ------- 渲染 ------- */
  return (
    <PaperProvider theme={theme}>
      <ScrollView>
        <View style={styles.container}>

          {/* 模式切换 */}
          <Button style={styles.button} mode="contained" onPress={() => setIsCustom(!isCustom)}>
            {isCustom ? 'Custom' : 'Random'}
          </Button>

          {/* 参数输入 */}
          <View style={styles.inputGroup}>
            {(['m', 'n', 'k', 'j', 's'] as const).map(key => (
              <React.Fragment key={key}>
                <TextInput
                  mode="outlined"
                  style={styles.input}
                  placeholder={key}
                  maxLength={3}
                  value={form[key]}
                  onChangeText={v => setField(key, v)}
                  editable={isCustom}
                />
                {key !== 's' && <Text style={styles.dash}>-</Text>}
              </React.Fragment>
            ))}
          </View>

          {/* 错误提示 */}
          {error && (
            <Card style={styles.errorCard}>
              <Card.Content><Text style={styles.errorText}>{error}</Text></Card.Content>
            </Card>
          )}

          {/* EXECUTE */}
          <Button
            style={[styles.button, styles.executeButton]}
            mode="contained"
            onPress={onExecute}
            loading={loading}
            disabled={loading}
          >
            {loading ? '计算中…' : 'Execute'}
          </Button>

          {/* 结果 */}
          {result && (
            <Card style={styles.resultCard}>
              <Card.Title title={`计算结果（${result.ms} ms）`} />
              <Card.Content>
                <Text style={styles.title}>样本池（{result.samplePool.length}）</Text>
                <Text>{result.samplePool.join(', ')}</Text>

                <Text style={styles.title}>
                  最优组合（{result.groups.length} 组）
                </Text>
                <List.Section>
                  {result.groups.map((g, i) => (
                    <List.Item
                      key={i}
                      title={`组 ${i + 1}: ${g.join(', ')}`}
                      left={props => <List.Icon {...props} icon="format-list-bulleted" />}
                    />
                  ))}
                </List.Section>
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>
    </PaperProvider>
  );
}

/* ------- 样式 ------- */
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 20, paddingTop: 60 },
  button:    { width: 200, marginBottom: 20 },
  executeButton: { backgroundColor: '#4CAF50', marginTop: 10 },
  inputGroup: { flexDirection: 'row', alignItems: 'center' },
  input: { width: 45, height: 40, textAlignVertical: 'center', paddingVertical: 0 },
  dash: { fontSize: 20, lineHeight: 40, marginHorizontal: 4 },
  errorCard: { backgroundColor: '#FFEBEE', width: '90%', marginTop: 10 },
  errorText: { color: '#D32F2F' },
  resultCard: { width: '90%', marginTop: 20 },
  title: { fontWeight: 'bold', marginTop: 10 },
});

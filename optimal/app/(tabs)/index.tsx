// optimal/app/(tabs)/index.tsx
import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Provider as PaperProvider,
  Button,
  TextInput,
  Text,
  Card,
  DefaultTheme,
  List,
  ProgressBar,
  IconButton
} from 'react-native-paper';

import {
  runOptimalAlgorithm,
  validateParams,
  randomParams,
  ProgressData
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
  
  // 新增进度状态
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>(undefined);
  const [showProgress, setShowProgress] = useState(false);
  
  // 取消令牌
  const cancelTokenRef = useRef<{ isCancelled: boolean }>({ isCancelled: false });

  /* ------- 主题 ------- */
  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, primary: '#2196F3' },
  };

  /* ------- 处理函数 ------- */
  const setField = (key: keyof typeof form, value: string) => {
    if (/^\d*$/.test(value)) setForm(f => ({ ...f, [key]: value }));
  };

  // 取消计算
  const handleCancel = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.isCancelled = true;
      setLoading(false);
      setShowProgress(false);
      setError('计算已取消');
    }
  };

  /** 点击 EXECUTE */
  const onExecute = async () => {
    setError(null);
    setResult(null);
    setProgress(0);
    setPhase('');
    setTimeRemaining(undefined);
    setShowProgress(false);
    
    // 重置取消令牌
    cancelTokenRef.current = { isCancelled: false };

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
      setTimeout(() => {
        if (loading && !result) {
          setShowProgress(true);
        }
      }, 500);

      const r = await runOptimalAlgorithm(
        params,
        (progressData: ProgressData) => {
          console.log('Progress update:', progressData); // 保留调试信息
          // 立即更新UI状态
          setProgress(progressData.totalProgress);
          setPhase(progressData.phase);
          setTimeRemaining(progressData.timeRemaining);
        },
        cancelTokenRef.current
      );
      
      if (!cancelTokenRef.current.isCancelled) {
        setResult(r);
      }
    } catch (e: any) {
      if (!cancelTokenRef.current.isCancelled) {
        setError(e.message || '执行失败');
      }
    } finally {
      setLoading(false);
      setShowProgress(false);
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
            loading={loading && !showProgress} // 只在未显示进度条时显示按钮loading
            disabled={loading}
          >
            {loading && !showProgress ? '计算中…' : 'Execute'}
          </Button>

          {/* 进度显示 */}
          {loading && (
            <Card style={styles.progressCard}>
              <Card.Content>
                {progress > 0 ? (
                  <>
                    <View style={styles.progressHeader}>
                      <View style={styles.progressInfo}>
                        <Text style={styles.progressTitle}>
                          当前阶段: {
                            phase === 'greedy' ? '贪心覆盖' : 
                            phase === 'local' ? '局部搜索' : 
                            phase === 'annealing' ? '模拟退火' : '初始化'
                          }
                        </Text>
                        <Text style={styles.progressSubtitle}>
                          {Math.round(progress * 100)}% 完成
                          {timeRemaining !== undefined && (
                            <>
                              {' · '}预计剩余: {
                                timeRemaining < 1000 ? '即将完成' : 
                                `${Math.round(timeRemaining / 1000)} 秒`
                              }
                            </>
                          )}
                        </Text>
                      </View>
                      <IconButton
                        icon="close-circle"
                        size={24}
                        onPress={handleCancel}
                        style={styles.cancelButton}
                      />
                    </View>
                    <ProgressBar 
                      progress={progress || 0.01}
                      style={styles.progressBar} 
                      color={theme.colors.primary}
                    />
                  </>
                ) : (
                  <Text style={{textAlign: 'center'}}>计算中...</Text>
                )}
              </Card.Content>
            </Card>
          )}

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
  // 新增样式
  progressCard: { width: '90%', marginVertical: 15, backgroundColor: '#F5F5F5' },
  progressBar: { height: 8, marginTop: 10, borderRadius: 4 },
  progressHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  progressInfo: { flex: 1 },
  progressTitle: { fontWeight: 'bold', fontSize: 14 },
  progressSubtitle: { marginTop: 4, fontSize: 12, color: '#757575' },
  cancelButton: { margin: 0, padding: 0 }
});
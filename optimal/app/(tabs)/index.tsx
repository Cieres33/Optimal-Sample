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
  IconButton,
  SegmentedButtons
} from 'react-native-paper';

import {
  runOptimalAlgorithm,
  validateParams,
  randomParams,
  ProgressData
} from '../services/optimalService';

import { Params, Result } from '../../src/optimal';

const App = () => {
  /* ------- UI 状态 ------- */
  const [isCustom, setIsCustom] = useState(false);
  const [value, setValue] = useState<'custom'|'random'>('random');
  const [form, setForm] = useState({
    m: '',
    n: '',
    k: '',
    j: '',
    s: '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<Result | null>(null);

  // 进度状态
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number|undefined>(undefined);
  const [showProgress, setShowProgress] = useState(false);

  // 取消令牌
  const cancelTokenRef = useRef<{ isCancelled: boolean }>({ isCancelled: false });

  /* ------- 主题 ------- */
  const customTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#2196F3',
      text: '#37474F',
      placeholder: '#BDBDBD',
      background: '#FFFFFF',
      surface: '#F5F5F5'
    },
  };

  const setField = (key: keyof typeof form, value: string) => {
    if (/^\d*$/.test(value)) setForm(f => ({ ...f, [key]: value }));
  };

  // 切到 Custom：保留已有 form，设为可编辑
  function handleCustomMode() {
    setIsCustom(true);
  }
  // 切到 Random：roll 新参数写入 form，不可编辑
  function handleRandomMode() {
    const p = randomParams();
    setForm({
      m: p.m.toString(),
      n: p.n.toString(),
      k: p.k.toString(),
      j: p.j.toString(),
      s: p.s.toString(),
    });
    setIsCustom(false);
  }

  // 取消计算
  const handleCancel = () => {
    cancelTokenRef.current.isCancelled = true;
    setLoading(false);
    setShowProgress(false);
    setError('计算已取消');
  };

  /** 点击 Execute */
  const onExecute = async () => {
    setError(null);
    setResult(null);
    setProgress(0);
    setPhase('');
    setTimeRemaining(undefined);
    setShowProgress(false);
    cancelTokenRef.current = { isCancelled: false };

    // 1. 收集参数
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
    // 2. 校验
    const errMsg = validateParams(params);
    if (errMsg) { setError(errMsg); return; }

    // 3. 调用算法
    try {
      setLoading(true);
      setTimeout(() => {
        if (loading && !result) setShowProgress(true);
      }, 500);

      const r = await runOptimalAlgorithm(
        params,
        (pd: ProgressData) => {
          setProgress(pd.totalProgress);
          setPhase(pd.phase);
          setTimeRemaining(pd.timeRemaining);
        },
        cancelTokenRef.current
      );
      if (!cancelTokenRef.current.isCancelled) setResult(r);
    } catch (e: any) {
      if (!cancelTokenRef.current.isCancelled) setError(e.message || '执行失败');
    } finally {
      setLoading(false);
      setShowProgress(false);
    }
  };

  return (
    <PaperProvider theme={customTheme}>
      <ScrollView>
        <View style={styles.container}>
          {/* Custom / Random 按钮 */}
          <SegmentedButtons
            value={value}
            onValueChange={nv => {
              setValue(nv as 'custom'|'random');
              if (nv === 'custom') handleCustomMode();
              else handleRandomMode();
            }}
            buttons={[
              {
                value: 'custom',
                label: 'Custom',
                style: value==='custom'?styles.activeSegment:styles.inactiveSegment
              },
              {
                value: 'random',
                label: 'Random',
                style: value==='random'?styles.activeSegment:styles.inactiveSegment
              },
            ]}
            style={styles.segmentGroup}
          />

          {/* 参数输入（始终显示，custom 可编辑，random 只读） */}
          <View style={styles.inputGroup}>
            {(['m','n','k','j','s'] as const).map(key => (
              <React.Fragment key={key}>
                <TextInput
                  mode="outlined"
                  style={styles.shortInput}
                  placeholder={key}
                  maxLength={3}
                  value={form[key]}
                  onChangeText={v => setField(key,v)}
                  editable={isCustom}
                />
                { key!=='s' && <Text style={styles.dash}>-</Text> }
              </React.Fragment>
            ))}
          </View>

          {/* 错误提示 */}
          {error && (
            <Card style={styles.errorCard}>
              <Card.Content>
                <Text style={styles.errorText}>{error}</Text>
              </Card.Content>
            </Card>
          )}

          {/* Execute 按钮 */}
          <Button
            style={styles.button}
            mode="contained"
            onPress={onExecute}
            loading={loading && !showProgress}
            disabled={loading}
          >
            {loading && !showProgress ? '计算中…' : 'Execute'}
          </Button>

          {/* 进度卡片 */}
          {loading && showProgress && (
            <Card style={styles.progressCard}>
              <Card.Content>
                <View style={styles.progressHeader}>
                  <View style={styles.progressInfo}>
                    <Text style={styles.progressTitle}>
                      阶段: {
                        phase==='greedy'?'贪心':
                        phase==='local'?'局部':'模拟退火'
                      }
                    </Text>
                    <Text style={styles.progressSubtitle}>
                      {Math.round(progress*100)}% 完成
                      {timeRemaining!=null && (
                        <> · 预计: {
                          timeRemaining<1000?'即将':`${Math.round(timeRemaining/1000)}s`
                        }</>
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
                  progress={progress||0.01}
                  style={styles.progressBar}
                  color={customTheme.colors.primary}
                />
              </Card.Content>
            </Card>
          )}

          {/* 结果展示 */}
          {result && (
            <Card style={styles.resultCard}>
              <Card.Title title={`结果 (${result.ms} ms)`} />
              <Card.Content>
                <Text style={styles.title}>
                  样本池 ({result.samplePool.length})
                </Text>
                <Text>{result.samplePool.join(', ')}</Text>
                <Text style={styles.title}>
                  组合 ({result.groups.length} 组)
                </Text>
                <List.Section>
                  {result.groups.map((g,i)=>
                    <List.Item
                      key={i}
                      title={`组 ${i+1}: ${g.join(', ')}`}
                      left={p=> <List.Icon {...p} icon="format-list-bulleted" />}
                    />
                  )}
                </List.Section>
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex:1, alignItems:'center', padding:20, paddingTop:80 },
  segmentGroup:{ width:200, marginBottom:20 },
  activeSegment:{ backgroundColor:'#2196F3' },
  inactiveSegment:{ backgroundColor:'#F5F5F5' },
  inputGroup:{ flexDirection:'row', flexWrap:'wrap', justifyContent:'center', padding:10 },
  shortInput:{ width:40, height:40, textAlignVertical:'center', paddingVertical:0 },
  dash:{ fontSize:20, lineHeight:40, marginHorizontal:5 },
  button:{ width:200, marginVertical:20 },
  errorCard:{ backgroundColor:'#FFEBEE', width:'90%', marginTop:10 },
  errorText:{ color:'#D32F2F' },
  progressCard:{ width:'90%', marginVertical:15, backgroundColor:'#F5F5F5' },
  progressHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  progressInfo:{ flex:1 },
  progressTitle:{ fontWeight:'bold', fontSize:14 },
  progressSubtitle:{ fontSize:12, color:'#757575' },
  cancelButton:{ margin:0, padding:0 },
  progressBar:{ height:8, borderRadius:4 },
  resultCard:{ width:'90%', marginTop:20 },
  title:{ fontWeight:'bold', marginTop:10 }
});

export default App;

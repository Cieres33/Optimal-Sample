// optimal/app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Provider as PaperProvider,
  Button,
  TextInput,
  Text,
  Card,
  DefaultTheme,
  List,
  SegmentedButtons,
  Snackbar
} from 'react-native-paper';

// 数据库导入
import { database } from '../db';
import { 
  getAllRecords, 
  storeResult as saveToDatabase 
} from '../services/dbService';

import {
  runOptimalAlgorithm,
  validateParams,
  getRunCount, 
  randomParams,
} from '../services/optimalService';

import { Params, Result } from '../../src/optimal';

// 调试信息
if (__DEV__) {
  console.log('数据库已初始化:', database.collections.get('records'));
}

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
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [runCount, setRunCount] = useState(1);
  
  // 存储相关状态
  const [storeLoading, setStoreLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

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

  // 初始化
  useEffect(() => {
    // 首次加载时使用随机模式
    handleRandomMode();
  }, []);

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

  /** 点击 Execute */
  const onExecute = async () => {
    setError(null);
    setResult(null);

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

    // 3. 获取运行次数
    try {
      const count = await getRunCount(params);
      setRunCount(count);
    } catch (e) {
      console.error('获取运行次数失败:', e);
    }

    // 4. 调用算法
    try {
      setLoading(true);
      const r = await runOptimalAlgorithm(params);
      setResult(r.result);
      setRunCount(r.runCount);
    } catch (e: any) {
      setError(e.message || '执行失败');
    } finally {
      setLoading(false);
    }
  };

  // 存储结果到数据库
  const handleStore = async () => {
    if (!result) {
      showSnackbar('没有可存储的结果');
      return;
    }

    try {
      setStoreLoading(true);
      const params = {
        m: parseInt(form.m),
        n: parseInt(form.n),
        k: parseInt(form.k),
        j: parseInt(form.j),
        s: parseInt(form.s)
      };
      
      await saveToDatabase(params, result, runCount);
      showSnackbar('结果已保存');
    } catch (e) {
      console.error('存储失败:', e);
      showSnackbar('存储失败');
    } finally {
      setStoreLoading(false);
    }
  };

  // 清除结果
  const handleClear = () => {
    setResult(null);
  };

  // 显示提示消息
  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
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

          {/* 参数输入 */}
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
            loading={loading}
            disabled={loading}
          >
            {loading ? '计算中…' : 'Execute'}
          </Button>

          {/* 结果操作按钮 */}
          {result && (
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={handleStore}
                style={[styles.actionButton, styles.storeButton]}
                loading={storeLoading}
                disabled={storeLoading}
              >
                Store
              </Button>
              <Button
                mode="outlined"
                onPress={handleClear}
                style={styles.actionButton}
              >
                Clear
              </Button>
            </View>
          )}

          {/* 结果展示 */}
          {result && (
            <Card style={styles.resultCard}>
              <Card.Title 
                title={`结果 (${result.ms} ms)`} 
                subtitle={`参数: ${form.m}-${form.n}-${form.k}-${form.j}-${form.s}-${runCount}-${result.groups.length}`}
              />
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

      {/* 提示消息 */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        action={{
          label: '关闭',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10
  },
  actionButton: {
    margin: 5,
    width: 100
  },
  storeButton: {
    backgroundColor: '#4CAF50'
  },
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
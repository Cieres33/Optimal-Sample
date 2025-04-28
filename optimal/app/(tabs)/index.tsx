import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
    Button,
    TextInput,
    Text,
    Card,
    DefaultTheme,
    List,
    SegmentedButtons,
    useTheme,
    Portal,
    Modal,
    Banner,
} from 'react-native-paper';

import {
    runOptimalAlgorithm,
    validateParams,
    randomParams,
    getRunCount,
} from '../services/optimalService';

import { Result } from '../../src/optimal';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    storeResult as saveToDatabase
    } from '../services/dbService';

export default function app(){
    const [isCustom, setIsCustom] = useState(false);
    const [m, setM] = React.useState('45');
    const [n, setN] = React.useState('8');
    const [k, setK] = React.useState('6');
    const [j, setJ] = React.useState('4');
    const [s, setS] = React.useState('4');
    const [minGroup,setMinGroup] = React.useState('1');
    const [loading, setLoading] = React.useState(false);
    const theme = useTheme();
    const [result, setResult] = React.useState<Result>();
    const [shownResult, setShownResult] = React.useState(false);
    const [storeLoading, setStoreLoading] = React.useState(false);
    const [snackbarVisible, setSnackbarVisible] = React.useState(false);
    const [snackbarMessage, setSnackbarMessage] = React.useState('');
    const showSnackbar = (message: string) => {
        setSnackbarMessage(message);
        setSnackbarVisible(true);
        };
    const handleStore = async () => {
        if (!result) {
            showSnackbar('No result to save'); return;
            }
            try {
                setStoreLoading(true);
                const params = {
                    m: parseInt(m),
                    n: parseInt(n),
                    k: parseInt(k),
                    j: parseInt(j),
                    s: parseInt(s)
                    };
                    await saveToDatabase(params, result, await getRunCount(params));
                    showSnackbar('Result saved successfully!');
                    } catch (e) {
                        console.error('Failed to save result!', e);
                        showSnackbar('Failed to save result!');
                    } finally {
                        setStoreLoading(false);
                        }
                    };
    return(
        <SafeAreaView>
            <View>
                <Banner
                    visible={snackbarVisible}
                    actions={
                        [
                            {
                                label: 'Close',
                                onPress: () => setSnackbarVisible(false),
                            },
                        ]}
                    style={styles.banner}
                    icon="alert-circle">
                    {snackbarMessage}
                </Banner>
                <SegmentedButtons style={{paddingBottom: 20, flex: 1}}
                    value={isCustom ? 'custom' : 'random'}
                    onValueChange={value => {
                        setIsCustom(value === 'custom');
                        if (value === 'random') {
                            const params = randomParams();
                            setM(params.m.toString());
                            setN(params.n.toString());
                            setK(params.k.toString());
                            setJ(params.j.toString());
                            setS(params.s.toString());
                            setMinGroup('1');
                        }
                    }}
                    buttons={[
                        { value: 'random', label: 'Random' },
                        { value: 'custom', label: 'Custom' },
                    ]}/>
                <View style={styles.row}>
                    <TextInput
                        mode="outlined"
                        label="m"
                        value={m}
                        onChangeText={text => {setM(text)}}
                        keyboardType="numeric"
                        maxLength={2}
                        style={styles.textInput}
                        disabled={!isCustom}
                    />
                    <Text style={styles.desc}>45≤m≤54</Text>
                </View>
                <View style={styles.row}>
                    <TextInput
                        mode="outlined"
                        label="n"
                        value={n}
                        onChangeText={text => {setN(text)}}
                        keyboardType="numeric"
                        maxLength={2}
                        style={styles.textInput}
                        disabled={!isCustom}
                    />
                    <Text style={styles.desc}>7≤n≤25</Text>
                </View>
                <View style={styles.row}>
                    <TextInput
                        mode="outlined"
                        label="k"
                        value={k}
                        onChangeText={text => {setK(text)}}
                        keyboardType="numeric"
                        maxLength={2}
                        style={styles.textInput}
                        disabled={!isCustom}
                    />
                    <Text style={styles.desc}>4≤k≤7</Text>
                </View>
                <View style={styles.row}>
                    <TextInput
                        mode="outlined"
                        label="j"
                        value={j}
                        onChangeText={text => {setJ(text)}}
                        keyboardType="numeric"
                        maxLength={2}
                        style={styles.textInput}
                        disabled={!isCustom}
                    />
                    <Text style={styles.desc}>j≤k</Text>
                </View>
                <View style={styles.row}>
                    <TextInput
                        mode="outlined"
                        label="s"
                        value={s}
                        onChangeText={text => {setS(text)}}
                        keyboardType="numeric"
                        maxLength={2}
                        style={styles.textInput}
                        disabled={!isCustom}
                    />
                    <Text style={styles.desc}>3≤s≤7</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.desc}>At least</Text>
                    <TextInput
                        mode="outlined"
                        label="S"
                        value={minGroup}
                        onChangeText={text => {setMinGroup(text)}}
                        keyboardType="numeric"
                        maxLength={1}
                        style={styles.textInput}
                        disabled={!isCustom}
                    />
                    <Text style={styles.desc}>Sample</Text>
                </View>
                <Button mode="contained" onPress={async () => {
                    setLoading(true);
                    const params = {
                        m: parseInt(m),
                        n: parseInt(n),
                        k: parseInt(k),
                        j: parseInt(j),
                        s: parseInt(s),
                        minSGroups: parseInt(minGroup),
                    };
                    const error = validateParams(params);
                    if (error) {
                        console.error(error);
                        setLoading(false);
                    } else {
                        try {
                        const result = await runOptimalAlgorithm(params);
                        setLoading(false);
                        setResult(result);
                        setShownResult(true);
                        }
                        catch (error) {
                            console.error(error);
                        } finally {
                            setLoading(false);
                        }
                    }
                }} style={{margin: 10}}
                loading={loading}
                disabled={loading}
                >
                    Execute
                </Button>
                <Portal>
                    <Modal visible={shownResult} onDismiss={()=>setShownResult(false)} contentContainerStyle={styles.containerStyle}>
                            <Card style={styles.resultCard}>
                                <Card.Title title={`计算结果（${result?.ms ?? 0} ms）`} />
                                <Card.Content style={{maxHeight: "80%"}}>
                                <Text style={styles.title}>样本池（{result?.samplePool.length}）</Text>
                                <Text>{result?.samplePool.join(', ')}</Text>
                                <Text style={styles.title}>
                                    最优组合（{result?.groups.length} 组）
                                </Text>
                                <FlatList style={{margin: 10}}
                                    data={result?.groups}
                                    keyExtractor={(_item, index) => index.toString()}
                                    renderItem={({ item }) => (
                                        <List.Item
                                            title={`组 ${item.join(', ')}`}
                                            left={props => <List.Icon {...props} icon="format-list-bulleted" />}
                                        />
                                    )}
                                />
                                </Card.Content>
                                <Card.Actions style={styles.buttonGroup}>
                                    <Button mode="contained" onPress={() => {
                                        handleStore();
                                        setShownResult(false);
                                    }} style={{margin: 10,flex: 1,backgroundColor:theme.colors.onPrimaryContainer}}>
                                        Save
                                    </Button>
                                    <Button mode="contained" onPress={() => {
                                        setShownResult(false);
                                    }} style={{margin: 10,flex: 1,backgroundColor:theme.colors.secondary}}>
                                        Clear
                                    </Button>
                                </Card.Actions>

                            </Card>
                    </Modal>
                </Portal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    banner: {
        margin: 10
    },
    row:{
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
    },
    desc:{
        flex: 1,
        textAlign: 'center',
        padding: 10,
        fontSize: 20,
        alignSelf: 'center',
        color: DefaultTheme.colors.secondary,
    },
    textInput:{
        flex: 1,
        marginRight: 10,
        textAlign: 'center',
    },
    buttonGroup:{
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    containerStyle: {
    },
    resultCard: {
        margin: 20,
        padding: 10,
        backgroundColor: DefaultTheme.colors.background,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
});
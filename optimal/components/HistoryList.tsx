// optimal/app/components/HistoryList.tsx
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List, Divider, Text } from 'react-native-paper';

const HistoryList = ({ 
  records, 
  onSelectRecord,
  style
}) => {
  if (!records || records.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.emptyText}>暂无历史记录</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={records}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <List.Item
            title={`#${index + 1}: ${item.displayString}`}
            description={`运行时间: ${item.executionTime}ms`}
            left={props => <List.Icon {...props} icon="history" />}
            onPress={() => onSelectRecord(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <Divider />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#757575'
  }
});

export default HistoryList;
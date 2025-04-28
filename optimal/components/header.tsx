import * as React from 'react';
import { Appbar } from 'react-native-paper';

export function MainHeader(){
    return(
    <Appbar.Header>
        <Appbar.Content title="Optimal Samples Selection" />
    </Appbar.Header>
    )
}

export function HistoryHeader(){
    return(
    <Appbar.Header>
        <Appbar.Content title="History Record" />
    </Appbar.Header>
    )
}
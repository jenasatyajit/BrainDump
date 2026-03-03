import React from 'react';
import { Text } from 'react-native';

interface DateDividerProps {
    label: string;
}

function DateDivider({ label }: DateDividerProps) {
    return (
        <Text className="py-2 text-center text-[10px] uppercase tracking-widest text-muted">
            {label}
        </Text>
    );
}

export default React.memo(DateDivider);

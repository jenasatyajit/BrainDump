import React from 'react';
import { View, Text } from 'react-native';

interface UserBubbleProps {
    content: string;
}

function UserBubble({ content }: UserBubbleProps) {
    return (
        <View className="max-w-[78%] self-end rounded-[20px] rounded-br-[4px] border border-border bg-surface2 px-3.5 py-2.5">
            <Text className="text-[15px] leading-[23px] text-text" style={{ fontFamily: 'DMSans_400Regular' }}>{content}</Text>
        </View>
    );
}

export default React.memo(UserBubble);

import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLibraryStore } from '@/store/libraryStore';
import { useChatStore } from '@/store/chatStore';
import LibraryHeader from '@/components/library/LibraryHeader';
import FilterChips from '@/components/library/FilterChips';
import BookCard from '@/components/library/BookCard';
import VideoCard from '@/components/library/VideoCard';
import ArticleCard from '@/components/library/ArticleCard';

export default function LibraryScreen() {
    const { filter, setFilter, getStats, getFilteredEntries } = useLibraryStore();
    const { loadMessages } = useChatStore();
    const [refreshing, setRefreshing] = useState(false);

    const stats = getStats();
    const entries = getFilteredEntries();

    const books = entries.filter((e) => e.libraryType === 'book');
    const videos = entries.filter((e) => e.libraryType === 'video');
    const articles = entries.filter((e) => e.libraryType === 'article');

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadMessages();
        setRefreshing(false);
    }, [loadMessages]);

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-bg">
            <LibraryHeader total={stats.total} />
            
            <FilterChips active={filter} stats={stats} onFilterChange={setFilter} />

            <ScrollView
                className="flex-1"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                {/* Books Section */}
                {(filter === 'all' || filter === 'books') && books.length > 0 && (
                    <View className="mb-6">
                        <View className="mb-3 flex-row items-center gap-2 px-6">
                            <View className="h-2 w-2 rounded-full bg-[#f59e6a]" />
                            <Text className="text-[13px] uppercase tracking-wide text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                Books
                            </Text>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="px-6"
                            contentContainerStyle={{ gap: 10 }}
                        >
                            {books.map((book) => (
                                <BookCard key={book.messageId + book.entryIndex} book={book} />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Videos Section */}
                {(filter === 'all' || filter === 'videos') && videos.length > 0 && (
                    <View className="mb-6 px-6">
                        <View className="mb-3 flex-row items-center gap-2">
                            <View className="h-2 w-2 rounded-full bg-[#7eb8ff]" />
                            <Text className="text-[13px] uppercase tracking-wide text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                Videos
                            </Text>
                        </View>
                        {videos.map((video) => (
                            <VideoCard key={video.messageId + video.entryIndex} video={video} />
                        ))}
                    </View>
                )}

                {/* Articles Section */}
                {(filter === 'all' || filter === 'articles') && articles.length > 0 && (
                    <View className="mb-6">
                        <View className="mb-3 flex-row items-center gap-2 px-6">
                            <View className="h-2 w-2 rounded-full bg-[#a78bfa]" />
                            <Text className="text-[13px] uppercase tracking-wide text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                Articles
                            </Text>
                        </View>
                        <View className="overflow-hidden rounded-2xl border-t border-border bg-surface2 px-6">
                            {articles.map((article, index) => (
                                <ArticleCard
                                    key={article.messageId + article.entryIndex}
                                    article={article}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Empty State */}
                {stats.total === 0 && (
                    <View className="mt-20 items-center px-6">
                        <Text className="text-5xl">📚</Text>
                        <Text className="mt-4 text-base text-muted">No resources yet</Text>
                        <Text className="mt-2 text-center text-sm text-muted">
                            Add books, videos, or articles{'\n'}from the Inbox tab
                        </Text>
                    </View>
                )}

                {/* Filtered Empty State */}
                {stats.total > 0 && entries.length === 0 && (
                    <View className="mt-20 items-center px-6">
                        <Text className="text-4xl">🔍</Text>
                        <Text className="mt-4 text-base text-muted">
                            No {filter === 'books' ? 'books' : filter === 'videos' ? 'videos' : 'articles'} yet
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

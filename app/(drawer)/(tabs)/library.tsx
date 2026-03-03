import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLibraryStore, type LibraryEntry } from '@/store/libraryStore';
import { useChatStore } from '@/store/chatStore';
import LibraryHeader from '@/components/library/LibraryHeader';
import FilterChips from '@/components/library/FilterChips';
import BookCard from '@/components/library/BookCard';
import VideoCard from '@/components/library/VideoCard';
import ArticleCard from '@/components/library/ArticleCard';
import LibraryEditModal from '@/components/library/LibraryEditModal';

const VIDEOS_PER_PAGE = 10;

export default function LibraryScreen() {
    const { filter, setFilter, getStats, getFilteredEntries } = useLibraryStore();
    const { loadMessages, editTask, deleteTask } = useChatStore();
    const [refreshing, setRefreshing] = useState(false);
    const [editEntry, setEditEntry] = useState<LibraryEntry | null>(null);
    const [videosDisplayCount, setVideosDisplayCount] = useState(VIDEOS_PER_PAGE);

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

    const handleLongPress = (entry: LibraryEntry) => {
        setEditEntry(entry);
    };

    const loadMoreVideos = useCallback(() => {
        if (filter === 'videos' && videosDisplayCount < videos.length) {
            setVideosDisplayCount(prev => Math.min(prev + VIDEOS_PER_PAGE, videos.length));
        }
    }, [filter, videosDisplayCount, videos.length]);

    const displayedVideos = useMemo(() => {
        return filter === 'videos' ? videos.slice(0, videosDisplayCount) : videos;
    }, [filter, videos, videosDisplayCount]);

    // Reset video count when filter changes
    React.useEffect(() => {
        setVideosDisplayCount(VIDEOS_PER_PAGE);
    }, [filter]);

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
                        <View className="mb-3 flex-row items-center justify-between px-6">
                            <Text className="text-[13px] uppercase tracking-wide text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                ● BOOKS
                            </Text>
                            {filter === 'all' && (
                                <TouchableOpacity onPress={() => setFilter('books')} activeOpacity={0.7}>
                                    <Text className="text-[12px] text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                        see all →
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="px-6"
                            contentContainerStyle={{ gap: 12 }}
                        >
                            {books.map((book) => (
                                <BookCard 
                                    key={book.messageId + book.entryIndex} 
                                    book={book}
                                    onLongPress={() => handleLongPress(book)}
                                />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Videos Section */}
                {(filter === 'all' || filter === 'videos') && videos.length > 0 && (
                    <View className="mb-6">
                        <View className="mb-3 flex-row items-center justify-between px-6">
                            <Text className="text-[13px] uppercase tracking-wide text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                ● VIDEOS
                            </Text>
                            {filter === 'all' && (
                                <TouchableOpacity onPress={() => setFilter('videos')} activeOpacity={0.7}>
                                    <Text className="text-[12px] text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                        see all →
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        
                        {filter === 'all' ? (
                            // Horizontal scroll for "All" tab
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="px-6"
                                contentContainerStyle={{ gap: 12 }}
                            >
                                {videos.map((video) => (
                                    <VideoCard 
                                        key={video.messageId + video.entryIndex} 
                                        video={video}
                                        onLongPress={() => handleLongPress(video)}
                                    />
                                ))}
                            </ScrollView>
                        ) : (
                            // Grid layout for "Videos" tab with lazy loading
                            <View className="px-6">
                                <FlatList
                                    data={displayedVideos}
                                    keyExtractor={(item) => item.messageId + item.entryIndex}
                                    renderItem={({ item }) => (
                                        <View className="mb-3">
                                            <VideoCard 
                                                video={item}
                                                onLongPress={() => handleLongPress(item)}
                                                fullWidth
                                            />
                                        </View>
                                    )}
                                    scrollEnabled={false}
                                    onEndReached={loadMoreVideos}
                                    onEndReachedThreshold={0.5}
                                    ListFooterComponent={
                                        videosDisplayCount < videos.length ? (
                                            <TouchableOpacity
                                                className="mt-2 rounded-xl border border-border2 bg-surface2 py-3"
                                                onPress={loadMoreVideos}
                                                activeOpacity={0.7}
                                            >
                                                <Text className="text-center text-sm text-muted" style={{ fontFamily: 'DMSans_500Medium' }}>
                                                    Load More ({videos.length - videosDisplayCount} remaining)
                                                </Text>
                                            </TouchableOpacity>
                                        ) : null
                                    }
                                />
                            </View>
                        )}
                    </View>
                )}

                {/* Articles Section */}
                {(filter === 'all' || filter === 'articles') && articles.length > 0 && (
                    <View className="mb-6 px-6">
                        <View className="mb-3 flex-row items-center justify-between">
                            <Text className="text-[13px] uppercase tracking-wide text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                ● ARTICLES
                            </Text>
                            {filter === 'all' && (
                                <TouchableOpacity onPress={() => setFilter('articles')} activeOpacity={0.7}>
                                    <Text className="text-[12px] text-muted" style={{ fontFamily: 'SpaceMono_400Regular' }}>
                                        see all →
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View className="overflow-hidden rounded-2xl border-t border-border bg-surface2">
                            {articles.map((article, index) => (
                                <ArticleCard
                                    key={article.messageId + article.entryIndex}
                                    article={article}
                                    onLongPress={() => handleLongPress(article)}
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

            <LibraryEditModal
                visible={!!editEntry}
                entry={editEntry}
                onClose={() => setEditEntry(null)}
                onSave={editTask}
                onDelete={deleteTask}
            />
        </SafeAreaView>
    );
}

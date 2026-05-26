import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import { STUDIO } from "../utils/theme";

interface SavedNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
}

const NOTES_STORAGE_KEY = "enhanced_notes_storage";

export function NotesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<SavedNote | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "title" | "updated">("recent");

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      if (stored) {
        setSavedNotes(JSON.parse(stored));
      }
    } catch (err) {
      console.log("Error loading notes:", err);
    }
  };

  const saveNote = async () => {
    if (!noteContent.trim()) {
      Alert.alert("Error", "Please enter note content");
      return;
    }

    try {
      const tags = noteTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      if (selectedNote) {
        // Update existing note
        const updatedNote: SavedNote = {
          ...selectedNote,
          title: noteTitle || "Untitled Note",
          content: noteContent,
          tags,
          updatedAt: Date.now(),
        };

        const updatedNotes = savedNotes.map((note) =>
          note.id === selectedNote.id ? updatedNote : note
        );
        setSavedNotes(updatedNotes);
        await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
      } else {
        // Create new note
        const newNote: SavedNote = {
          id: Date.now().toString(),
          title: noteTitle || "Untitled Note",
          content: noteContent,
          tags,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          favorite: false,
        };

        const updatedNotes = [newNote, ...savedNotes];
        setSavedNotes(updatedNotes);
        await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
      }

      setNoteTitle("");
      setNoteContent("");
      setNoteTags("");
      setSelectedNote(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert("Error", "Failed to save note");
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const updatedNotes = savedNotes.filter((note) => note.id !== noteId);
      setSavedNotes(updatedNotes);
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
      setSelectedNote(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert("Error", "Failed to delete note");
    }
  };

  const toggleFavorite = async (noteId: string) => {
    const updatedNotes = savedNotes.map((note) =>
      note.id === noteId ? { ...note, favorite: !note.favorite } : note
    );
    setSavedNotes(updatedNotes);
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const duplicateNote = async (note: SavedNote) => {
    const newNote: SavedNote = {
      ...note,
      id: Date.now().toString(),
      title: `${note.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedNotes = [newNote, ...savedNotes];
    setSavedNotes(updatedNotes);
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const editNote = (note: SavedNote) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTags(note.tags.join(", "));
  };

  const copyNoteContent = async (content: string) => {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "Note content copied to clipboard");
  };

  const clearForm = () => {
    setNoteTitle("");
    setNoteContent("");
    setNoteTags("");
    setSelectedNote(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Filter and sort notes
  const filteredNotes = savedNotes
    .filter((note) => {
      if (filterFavorites && !note.favorite) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "updated") return b.updatedAt - a.updatedAt;
      return b.createdAt - a.createdAt; // recent
    });

  const handleNoteOptions = (note: SavedNote) => {
    Alert.alert(note.title, "Choose an action", [
      {
        text: "Edit",
        onPress: () => editNote(note),
      },
      {
        text: "Duplicate",
        onPress: () => duplicateNote(note),
      },
      {
        text: "Copy Content",
        onPress: () => copyNoteContent(note.content),
      },
      {
        text: note.favorite ? "Remove from Favorites" : "Add to Favorites",
        onPress: () => toggleFavorite(note.id),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert("Delete Note", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteNote(note.id) },
          ]);
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: STUDIO.void }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <LinearGradient
          colors={[STUDIO.swirlPink, STUDIO.swirlOrange] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Pressable onPress={() => navigation.goBack()}>
              {({ pressed }) => (
                <View
                  className="w-8 h-8 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: pressed
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(255,255,255,0.2)",
                  }}
                >
                  <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            <Text className="text-white text-lg font-bold">Notes</Text>

            <Pressable onPress={() => setFilterFavorites(!filterFavorites)}>
              {({ pressed }) => (
                <View
                  className="w-8 h-8 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: pressed || filterFavorites
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(255,255,255,0.2)",
                  }}
                >
                  <Ionicons
                    name={filterFavorites ? "star" : "star-outline"}
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </Pressable>
          </View>

          {/* Search Bar */}
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notes..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            className="px-4 py-2 rounded-xl text-white"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          />
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Note Editor */}
          <View
            className="p-4 rounded-xl mb-4"
            style={{ backgroundColor: STUDIO.dark, borderWidth: 1, borderColor: STUDIO.border }}
          >
            <Text className="text-lg font-bold mb-3" style={{ color: STUDIO.text }}>
              {selectedNote ? "Edit Note" : "New Note"}
            </Text>

            <TextInput
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholder="Note title (optional)"
              placeholderTextColor={STUDIO.nickelDark}
              className="px-4 py-3 rounded-xl mb-3 text-base"
              style={{ backgroundColor: STUDIO.slate, color: STUDIO.text }}
            />

            <TextInput
              value={noteContent}
              onChangeText={setNoteContent}
              placeholder="Write your note here..."
              placeholderTextColor={STUDIO.nickelDark}
              multiline
              numberOfLines={6}
              className="px-4 py-3 rounded-xl mb-3 text-base"
              style={{
                backgroundColor: STUDIO.slate,
                color: STUDIO.text,
                minHeight: 120,
                textAlignVertical: "top",
              }}
            />

            <TextInput
              value={noteTags}
              onChangeText={setNoteTags}
              placeholder="Tags (comma-separated)"
              placeholderTextColor={STUDIO.nickelDark}
              className="px-4 py-3 rounded-xl mb-3 text-base"
              style={{ backgroundColor: STUDIO.slate, color: STUDIO.text }}
            />

            <View className="flex-row gap-2">
              <Pressable onPress={saveNote} className="flex-1">
                {({ pressed }) => (
                  <View
                    className="py-3 rounded-xl items-center"
                    style={{
                      backgroundColor: STUDIO.amber,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Text className="font-semibold" style={{ color: STUDIO.void }}>
                      {selectedNote ? "Update Note" : "Save Note"}
                    </Text>
                  </View>
                )}
              </Pressable>

              {(noteTitle || noteContent || noteTags || selectedNote) && (
                <Pressable onPress={clearForm}>
                  {({ pressed }) => (
                    <View
                      className="px-4 py-3 rounded-xl items-center justify-center"
                      style={{
                        backgroundColor: STUDIO.slate,
                        opacity: pressed ? 0.7 : 1,
                      }}
                    >
                      <Ionicons name="close" size={20} color={STUDIO.text} />
                    </View>
                  )}
                </Pressable>
              )}
            </View>
          </View>

          {/* Sort Options */}
          <View className="flex-row gap-2 mb-4">
            {(["recent", "title", "updated"] as const).map((sort) => (
              <Pressable
                key={sort}
                onPress={() => {
                  setSortBy(sort);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                {({ pressed }) => (
                  <View
                    className="px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: sortBy === sort ? STUDIO.amber : STUDIO.slate,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: sortBy === sort ? STUDIO.void : STUDIO.text }}
                    >
                      {sort === "recent" ? "Recent" : sort === "title" ? "Title" : "Updated"}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Notes List */}
          <Text className="text-sm font-semibold mb-3" style={{ color: STUDIO.nickelLight }}>
            {filterFavorites ? "Favorite Notes" : "All Notes"} ({filteredNotes.length})
          </Text>

          {filteredNotes.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="document-text-outline" size={48} color={STUDIO.nickelDark} />
              <Text className="text-center mt-4 text-base" style={{ color: STUDIO.nickelLight }}>
                {searchQuery || filterFavorites ? "No notes found" : "No notes yet"}
              </Text>
            </View>
          ) : (
            filteredNotes.map((note) => (
              <Pressable
                key={note.id}
                onPress={() => handleNoteOptions(note)}
                className="mb-3"
              >
                {({ pressed }) => (
                  <View
                    className="p-4 rounded-xl"
                    style={{
                      backgroundColor: STUDIO.dark,
                      borderWidth: 1,
                      borderColor: STUDIO.border,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <Text
                        className="text-lg font-bold flex-1"
                        numberOfLines={1}
                        style={{ color: STUDIO.text }}
                      >
                        {note.title}
                      </Text>
                      {note.favorite && (
                        <Ionicons name="star" size={18} color={STUDIO.amber} />
                      )}
                    </View>

                    <Text
                      className="text-sm mb-2"
                      numberOfLines={3}
                      style={{ color: STUDIO.nickelLight }}
                    >
                      {note.content}
                    </Text>

                    {note.tags.length > 0 && (
                      <View className="flex-row flex-wrap gap-2 mb-2">
                        {note.tags.map((tag, index) => (
                          <View
                            key={index}
                            className="px-2 py-1 rounded"
                            style={{ backgroundColor: STUDIO.slate }}
                          >
                            <Text className="text-xs" style={{ color: STUDIO.amber }}>
                              #{tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <Text className="text-xs" style={{ color: STUDIO.nickelDark }}>
                      {new Date(note.updatedAt).toLocaleDateString()} at{" "}
                      {new Date(note.updatedAt).toLocaleTimeString()}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

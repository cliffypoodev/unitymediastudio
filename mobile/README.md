# Unity Studio - Multi-Media Creative Toolkit

## In-App Video Stitching ⭐ NEW

The Movie Maker now supports **seamless in-app video playback** without requiring FFmpeg or external apps!

### How It Works
Since FFmpeg is not available in Expo/React Native, we've implemented a custom Sequential Video Player that:
- Plays multiple video clips in sequence with smooth transitions
- Supports fade, dissolve, wipe, and slide transitions
- Provides a professional playback experience entirely within the app
- No need to export to iMovie, CapCut, or other external editors

### Features
- **In-App Player** (Recommended): Watch your stitched video with transitions directly in the app
- **Sequential Export**: Fallback option to export clips individually for manual editing
- **Smart Controls**: Play/pause, skip clips, restart, progress tracking
- **Transition Support**: Fade and dissolve transitions between clips
- **Auto-advance**: Automatically moves to next clip with smooth transitions

### Components
- `src/components/SequentialVideoPlayer.tsx`: Custom video player with transition support
- `src/utils/videoProcessor.ts`: Processing utilities for in-app playback and export
- Integration in MovieMakerScreen with "Play In-App" and "Export Files" options

### Usage
1. Add videos to your project in Movie Maker
2. Arrange clips in timeline order
3. Set transitions between clips (fade, dissolve, etc.)
4. Tap "Create" → Choose "Play In-App ⭐"
5. Watch your video with smooth transitions!

---

## Cross-Platform Web Support

The app now supports running on web browsers via Expo Web, making it accessible on any platform or device.

### Web-Compatible Features
- **Movie Maker**: Full drag-and-drop timeline editor works on web
- **Video Library**: Swipe navigation and video preview
- **Media Picker**: Uses browser File System Access API with permission prompts
- **File Selection**: Native browser file picker for selecting videos/images
- **WebView Pages**: Suno, DistroKid, MS Word, and HyperWrite open in new browser tabs (iframe embedding blocked by security policies)

### Platform Utilities (`src/utils/platform.ts`)
- `isWeb`: Check if running on web platform
- `safeHaptics`: Haptic feedback that gracefully degrades on web (no-op)
- `triggerHapticLight/Medium/Heavy`: Worklet-compatible haptic functions

### Media Picker (`src/utils/mediaPicker.ts`)
Cross-platform media selection that works on both native and web:
- `pickVideo()`: Select a single video
- `pickImage()`: Select a single image
- `pickMultipleVideos()`: Select multiple videos
- `getAllVideos()`: Get all videos (directory picker on web)
- `requestMediaPermission()`: Request media library access

### Web-Specific Screen Implementations
The following screens have `.web.tsx` versions that automatically load on web:
- **TitleScreen.web.tsx**: Same animated title screen without haptics
- **PhotoStreamScreen.web.tsx**: File upload with drag-and-drop instead of MediaLibrary
- **PhotosVideosScreen.web.tsx**: HTML5 video upload and playback
- **MusicLibraryScreen.web.tsx**: HTML5 audio player instead of expo-av
- **ImageCreateScreen.web.tsx**: Web-compatible image generation with download buttons
- **ImageLibraryScreen.web.tsx**: Web gallery with download functionality
- **VideoLibraryScreen.web.tsx**: HTML5 video playback with download support
- **CustomTabBar.web.tsx**: Tab bar without haptics
- **SunoScreen.web.tsx**: Opens Suno.com in new browser tab (iframe blocked by site security)
- **DistroKidScreen.web.tsx**: Opens DistroKid.com in new browser tab (iframe blocked by site security)
- **WritingScreen.web.tsx**: Opens MS Word and HyperWrite in new browser tabs when selected
- **DownloadScreen.web.tsx**: Simplified version that opens ytmp3.as in new tab

### Web Limitations
- Haptic feedback not available (silently ignored)
- Camera uses browser getUserMedia API
- File system access requires user permission prompts
- YouTube audio download opens external site (ytmp3.as) instead of in-app
- Some native-only features gracefully degrade
- External websites (Suno, DistroKid, MS Word, HyperWrite) open in new browser tabs due to CORS/iframe security restrictions

---

## YouTube MP3 Download - HYBRID DUAL-METHOD SYSTEM (January 2026)

**CURRENT METHOD:** Dual-method approach with automatic fallback

The app uses a smart two-tier download system for maximum reliability:

### Method 1: Direct API (Primary) ⭐
- **First attempt:** Direct API calls to `iotacloud.org/api/`
- **Fastest method:** No WebView overhead, instant start
- **Reliable:** Uses authenticated ytmp3.as backup API
- **Implementation:** `src/api/ytmp3-download.ts`
- **Auth generation:** Automatically generates authentication tokens
- **Polling:** Monitors conversion progress until complete

### Method 2: WebView Proxy (Fallback)
- **Automatic fallback:** Only if direct API fails
- **Benefits:** Uses ytmp3.as latest working endpoints
- **How it works:**
  1. Opens ytmp3.as in hidden WebView with YouTube URL pre-filled
  2. Auto-submits the conversion form (no manual interaction)
  3. Monitors page and intercepts download URLs
  4. Detects endpoints (`/~d/`, `.mp3`, cloud URLs)
  5. Closes WebView and downloads file natively
- **Self-healing:** Works even when ytmp3.as updates infrastructure
- **Implementation:** `src/screens/DownloadScreen.tsx`

**Key Features:**
- **Dual reliability:** Primary fast API + backup WebView method
- **Automatic switching:** Seamlessly falls back if API unavailable
- **Ad blocking:** Prevents popups in WebView fallback
- **Multiple detection:** Navigation, fetch, XHR, DOM polling
- **User experience:** One-tap download, fully automated
- **Status updates:** Real-time progress for both methods

**User Experience:**
1. Tap any YouTube search result
2. App tries direct API first (faster)
3. If API fails, automatically switches to WebView method
4. Download completes and saves to library
5. No manual intervention required

---

A comprehensive mobile app for creators to produce music, images, videos, and written content. Features AI-powered tools and seamless integration with professional platforms.

## AI Assistant

A centered AI assistant button is integrated into the bottom tab bar, positioned between the Images and Video tabs:
- **Central position**: Aligned with other tab buttons for a cohesive design
- **Gradient design**: Eye-catching blue-to-cyan gradient with sparkles icon
- **Expandable chat interface**: Tap to open full-screen AI chat
- **Chat history sidebar**: Browse and switch between previous conversations
  - Menu button to access chat history
  - See all past conversations with message counts
  - Tap to switch between conversations
  - Long-press to delete conversations
  - New chat button to start fresh conversations
- **Persistent conversation history**: All chats are automatically saved and retained across sessions
  - Messages persist even after closing the app
  - Continue conversations where you left off
  - Assistant remembers context from previous messages
  - Chat history stored securely on device using AsyncStorage
- **Dual AI providers**:
  - **ChatGPT (GPT-4o)**: OpenAI's latest model for general assistance
  - **Gemini 2.0**: Google's advanced AI for alternative perspectives
- **Toggle between assistants**: Switch between ChatGPT and Gemini with one tap
- **Full text functionality**:
  - Selectable text in messages
  - Long-press menu to copy or resend messages
  - Paste button for quick clipboard input
  - Copy entire messages with one tap
  - Resend previous messages as new prompts
- **Context-aware help**: Ask questions about app features, creative ideas, or anything else
- **Globally accessible**: Available from any screen via the tab bar

## Navigation System

The app features a slim bottom navigation bar positioned above the main menu tiles. This navigation bar adapts to the current screen context:

### Standard Navigation
- **Back button**: Navigate to previous page
- **Forward button**: Navigate to next page
- **Stop button**: Stop loading current page
- **Reload button**: Refresh current page

### Context-Aware App Launchers
Additional buttons appear based on the screen you're viewing:

- **YouTube screen**: YouTube app launcher
- **Suno screen**: Suno app launcher
- **DistroKid screen**: DistroKid app launcher
- **Image screens** (Create, Hub, Library): Sora launcher + Gemini launcher
- **Video screens** (Create, Hub, Library): Sora launcher + Gemini launcher

This navigation bar remains fixed at the bottom, just above the main menu tiles, providing consistent navigation throughout the app.

## Design Theme

Unity Studio features a sleek dark theme with refined brushed nickel and wood accents, inspired by vintage radio aesthetics:
- **Dark Foundation**: Deep blacks and charcoal backgrounds
- **Brushed Nickel**: Metallic button accents and highlights
- **Wood Tones**: Warm brown accents for action buttons
- **Amber Glow**: Warm accent color for active states
- **Vibrant Swirl**: Colorful splash background on the home screen

## App Structure

After the animated title screen, users see a welcome hub with "Choose Below" text and animated arrows pointing down to the bottom navigation tabs.

The app is organized into 4 main sections accessible via bottom tabs, each with its own hub and navigation:

### 1. Music Tab
A hub for all music creation and distribution tools with navigation tiles:

#### Search YT (YouTube Audio Downloader)
- **Two modes:**
  - **Search YouTube (default)**: Search directly within the app and download with one tap
  - **Manual Convert**: Opens ytmp3.as in a WebView for manual conversion
- Search YouTube directly within the app
- **Pull-to-refresh** - Refresh search results
- **Infinite scroll** - Load more results with "Load More" button at bottom
- **One-tap download** - Tap any result to start automatic conversion and download
  - **Auto-paste URL**: Clicking a search result automatically fills the YouTube URL in the conversion field
  - **Auto-submit**: The conversion form is automatically submitted after 1.5 seconds
- **YTMP3.as WebView Integration**:
  - **Automated conversion** - Auto-submits form, intercepts download URLs
  - **Blocks ad popups** - Prevents unwanted popup windows
  - **Multiple detection methods** - Navigation interception, fetch/XHR monitoring, DOM polling
  - **Self-updating** - Always uses ytmp3.as's latest working endpoints
  - **Title preservation** - Saves files with proper YouTube video titles
  - **Manual mode** - Access full ytmp3.as website for advanced features
- Extracts and downloads audio automatically
- Shows download progress with visual feedback
- File size validation to ensure successful downloads

#### Library
- View all downloaded audio files
- **Full playback controls** with enhanced music player:
  - **Play/Pause toggle**: Seamlessly pause and resume playback
  - **Progress bar**: Visual timeline with seek/scrub functionality
  - **Time display**: Current position and total duration
  - **Skip controls**: Jump forward/backward 10 seconds
  - **Track information**: Display currently playing track name
  - **Close button**: Stop playback and dismiss player
- Play audio in-app with built-in player
- Open audio in other apps (AudioStretch, GarageBand, etc.)
- Delete audio files
- Track details: name, duration, download date

#### Lyrics
- **Dual-tab interface** - Separate tabs for Search and Generate
- **Search Lyrics Tab:**
  - **Genius.com integration** - Comprehensive lyrics database
  - **Smart filtering** - Prioritizes relevant songs
  - Search by song title or artist
  - Copy lyrics with one tap
  - Lyrics history for quick access
- **Generate Lyrics Tab:**
  - **AI Lyrics Generator**: Create custom lyrics
  - Describe song theme, mood, and genre
  - Quick prompt buttons for common styles

#### Suno
- Embedded Suno.com web view
- Slim bottom navigation bar with Suno app launcher
- Seamless music creation workflow

#### DistroKid
- Embedded DistroKid.com web view
- Slim bottom navigation bar with DistroKid app launcher
- Easy music distribution

### 2. Images Tab
Hub with navigation tiles for AI image generation. All image screens include a bottom navigation bar with quick access to Sora and Gemini.

#### Create
- Generate images using multiple AI models:
  - **OpenAI GPT-Image**: High quality image generation
  - **Nano Banana**: Fast Google Gemini-based generation
  - **Banana Pro**: HD quality generation (~30s)
  - **Kling AI**: High-quality image generation with **image-to-image** support
- Aspect ratio options: Square, Landscape, Portrait
- Quality/size settings
- **Image-to-image generation** with Kling (upload source image to transform)
- Save images to device library
- Share and preview generated images
- **Prompt history** for quick reuse

#### Library
- View all generated images in a grid
- Full-screen image preview with gesture controls:
  - **Pinch-to-zoom**: Zoom in/out (1x to 4x)
  - **Double-tap**: Quick zoom toggle (tap once to zoom 2x, tap again to reset)
  - **Pan/drag**: Move around zoomed images
  - **Swipe navigation**: Swipe left/right to browse between images
  - **Image counter**: Shows current position (e.g., "3 / 10")
  - **Navigation buttons**: Previous/Next buttons for browsing
- **Reuse Prompt**: One-tap button to regenerate images with the same prompt
- View prompt and generation details
- Save to device library
- Share images
- Delete images

#### Upscaler
- **Image Upscaling**: Resize any image to 3000x3000px format
- **1:1 Aspect Ratio**: Perfect square format for album covers and music platforms
- **Two Input Options**:
  - Upload photos from your device photo library
  - Select from your generated images in the Image Library
- **High Quality**: PNG format with maximum quality preservation
- Save upscaled images to device library
- Optimized for Spotify, Apple Music, and other streaming platforms

### 3. Video Tab
Hub with navigation tiles for AI video generation. All video screens include a bottom navigation bar with quick access to Sora and Gemini.

#### Create
- **Sora 2.0** (OpenAI) - Duration options: 4s, 8s, 12s; Quality: Standard/Pro
- **Google Veo 3.1** - Duration options: 4s, 6s, 8s
- **Kling AI** - Duration options: 5s, 10s; Quality: Standard/Pro
- Dynamic duration selector based on chosen platform
- Quality mode selection for Sora and Kling (Standard for faster, Pro for higher quality)
- Image-to-video support (Sora and Kling)
- Async video generation with polling
- Save generated videos to library

#### Library
- View all generated videos
- Full-screen video playback with proper video switching
- View prompt and generation details
- Save to device library
- Share videos
- Delete videos

#### Movie Maker
- **Professional drag-and-drop timeline editor** inspired by iMovie and CapCut
- **Drag and Drop Timeline**:
  - Visual horizontal timeline with clip thumbnails
  - Drag clips left or right to reorder
  - Real-time feedback with scale animations
  - Haptic feedback for interactions
  - Long press to grab and move clips
- **Project Management**:
  - Create and manage multiple movie projects
  - Save projects with automatic updates
  - Delete projects when no longer needed
- **Video Timeline Editor**:
  - Add videos from device photo library
  - Visual clip cards with duration and order badges
  - Remove clips with inline delete buttons
  - Preview individual clips in full player
  - Automatic clip numbering and ordering
- **Transitions**:
  - Apply transitions between clips (None, Fade, Dissolve, Wipe)
  - Visual transition indicators on timeline
  - Per-clip transition settings
- **Video Creation (3 Methods)**:
  - **JSON2Video Cloud API** (Recommended):
    - Professional video stitching with transitions
    - High-quality rendering in the cloud
    - Automatic progress tracking
    - Add API key: `EXPO_PUBLIC_JSON2VIDEO_API_KEY`
  - **CapCut API** (Advanced):
    - Local API server integration
    - Full CapCut editing capabilities
    - Install from GitHub: https://github.com/sun-guannan/VectCutAPI
  - **Export Clips** (Fallback):
    - Save numbered clips for manual editing
    - No automatic transitions
    - Use with desktop video editors
- **Professional Features**:
  - Gesture-based clip reordering
  - Real-time preview updates
  - Clip selection and settings panel
  - Timeline scroll for long projects
  - Visual feedback for dragging state
  - Smart rendering method detection

### 4. Writing Tab
Hub with navigation tiles for writing tools and AI assistants:

#### Book Assistant
- **Scholarly AI Writing Companion**: Chat with a highly skilled linguistic expert and creative author
- **Persistent chat history**: All conversations saved with dedicated book project tracking
- **Project management**: Create multiple book projects, switch between them seamlessly
- **Chat history sidebar**: Browse all your book projects with message counts
- **Expert guidance on**:
  - Literary analysis and critique
  - Creative writing across all genres
  - Character development and plot structure
  - World-building and narrative techniques
  - Grammar, style, and linguistic nuances
  - Book planning and manuscript development
- **Context-aware**: Remembers entire conversation history for each project
- **Full text functionality**: Copy, paste, and resend messages

#### Notes
- **Enhanced note-taking system** with powerful features:
- **Rich editing**:
  - Title and content fields
  - Tag support with comma-separated tags
  - Edit existing notes
- **Organization**:
  - Search across titles, content, and tags
  - Filter by favorites (star notes)
  - Sort by recent, title, or last updated
- **Actions**:
  - Duplicate notes
  - Copy content to clipboard
  - Mark as favorite/unfavorite
  - Delete with confirmation
- **Persistent storage**: All notes saved securely on device

#### MS Word
- **Microsoft Word Online integration**
- Full web interface embedded in-app
- Login with your Microsoft account
- Access all Word features and cloud-saved documents
- Slim bottom navigation bar (back, forward, stop, reload)
- Loading progress indicator

#### HyperWrite
- **HyperWrite AI writing assistant**
- Full web interface embedded in-app
- Login with your HyperWrite account
- Access all HyperWrite writing tools and features
- Slim bottom navigation bar (back, forward, stop, reload)
- Loading progress indicator

## File Structure

```
src/
├── screens/
│   ├── TitleScreen.tsx          # Animated title/splash screen
│   ├── MusicHubScreen.tsx       # Music hub with navigation tiles
│   ├── DownloadScreen.tsx       # YouTube search and download
│   ├── LyricsScreen.tsx         # Lyrics search and generation
│   ├── SunoScreen.tsx           # Suno.com web view
│   ├── DistroKidScreen.tsx      # DistroKid.com web view
│   ├── ImageHubScreen.tsx       # Image hub with navigation tiles
│   ├── ImageCreateScreen.tsx    # AI image generation
│   ├── ImageLibraryScreen.tsx   # View image history
│   ├── VideoHubScreen.tsx       # Video hub with navigation tiles
│   ├── VideoCreateScreen.tsx    # AI video generation (Sora 2, Veo & Kling)
│   ├── VideoLibraryScreen.tsx   # View video history
│   ├── MovieMakerScreen.tsx     # Video editing and stitching
│   ├── WritingScreen.tsx        # Writing hub with navigation tiles
│   ├── BookAssistantScreen.tsx  # Scholarly AI writing assistant
│   ├── NotesScreen.tsx          # Enhanced notes with tags and search
│   ├── LibraryScreen.tsx        # Content library (legacy)
│   └── EditorScreen.tsx         # Audio editor (legacy)
├── components/
│   ├── SlimNavBar.tsx           # Slim bottom navigation bar with context-aware app launchers
│   ├── CustomTabBar.tsx         # Custom tab bar with integrated AI assistant button
│   ├── FloatingAIAssistant.tsx  # AI assistant chat interface (ChatGPT/Gemini)
│   └── MiniPlayer.tsx           # Audio mini player
├── navigation/
│   └── RootNavigator.tsx        # Tab and stack navigation
├── api/
│   ├── chat-service.ts          # AI text generation
│   ├── image-generation.ts      # Image generation API
│   ├── video-editing.ts         # Video stitching & editing (JSON2Video, CapCut)
│   ├── openai.ts                # OpenAI client
│   ├── gemini.ts                # Google Gemini client
│   └── grok.ts                  # Grok client
└── state/
    ├── audioStore.ts            # Zustand store for audio, lyrics
    └── aiChatStore.ts           # Zustand store for AI chat persistence
```

## Navigation Structure

### Bottom Tabs (Main Navigation)
Each tab uses nested stack navigation for organized content:

1. **Music Tab** (Stack Navigator)
   - Music Hub → YT Download, Lyrics, Suno, DistroKid

2. **Images Tab** (Stack Navigator)
   - Image Hub → Create, Library

3. **Video Tab** (Stack Navigator)
   - Video Hub → Create, Library

4. **Writing Tab** (Stack Navigator)
   - Writing Hub → Book Assistant, Notes, MS Word, HyperWrite

### Stack Navigation Details

**Music Stack:**
1. Music Hub (landing with tiles)
2. YouTube Download
3. Lyrics Search & Generation
4. Suno (full screen web view)
5. DistroKid (full screen web view)

**Image Stack:**
1. Image Hub (landing with tiles)
2. Create Image (generation interface)
3. Image Library (grid view of history)

**Video Stack:**
1. Video Hub (landing with tiles)
2. Create Video (generation interface)
3. Video Library (list view of history)
4. Movie Maker (video editing and stitching)

**Writing Stack:**
1. Writing Hub (landing with tiles)
2. Book Assistant (AI writing companion)
3. Notes (enhanced note-taking)
4. MS Word (embedded web view)
5. HyperWrite (embedded web view)

## State Management

Uses Zustand with AsyncStorage persistence for:
- **Downloaded audio tracks** - Key: `"audio-storage"`
- **Lyrics content and history** - Search and generated lyrics
- **Generated images** - Key: `"image_generation_history"`
- **Image prompt history** - Key: `"image_prompt_history"`
- **Generated videos** - Key: `"video_generation_history"`
- **Movie Maker projects** - Key: `"movie_maker_projects"` - Video editing projects with clips and transitions
- **Enhanced notes** - Key: `"enhanced_notes_storage"` - Notes with tags, search, and favorites
- **AI Chat conversations** - Key: `"ai-chat-storage"` - Persistent chat history with AI assistants (FloatingAIAssistant and Book Assistant)

## API Integrations

### Music Tools
- YouTube audio extraction via multi-service fallback
- Genius.com for lyrics search
- OpenAI GPT-4o for AI lyrics generation
- Suno.com for music creation
- DistroKid for music distribution

### Image Tools
- OpenAI GPT-Image (gpt-image-1)
- Google Gemini Flash Image (gemini-2.5-flash-image)
- Banana Pro for HD generation
- Kling AI for high-quality images with image-to-image transformation

### Video Tools
- **Sora 2.0**: OpenAI's video generation model
  - API key: `EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY`
  - Durations: 4, 8, or 12 seconds
  - Async job-based generation with polling
- **Google Veo 3.1**: Google's video generation model
  - API key: `EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY`
  - Durations: 4, 6, or 8 seconds
  - Long-running operation with status polling
- **Kling AI**: Kling's video and image generation model
  - Access Key: `EXPO_PUBLIC_VIBECODE_KLING_ACCESS_KEY`
  - Secret Key: `EXPO_PUBLIC_VIBECODE_KLING_SECRET_KEY`
  - Durations: 5 or 10 seconds
  - Quality modes: Standard (faster) and Pro (higher quality)
  - Task-based generation with status polling
  - JWT token authentication using Access Key + Secret Key
- **JSON2Video API**: Cloud-based video editing and stitching
  - API key: `EXPO_PUBLIC_JSON2VIDEO_API_KEY`
  - Professional video stitching with transitions
  - Multi-clip projects with effects
  - High-quality rendering
  - Alternative to FFmpeg for mobile
- **CapCut API**: Advanced video editing (optional)
  - Local API server integration
  - Full CapCut editing capabilities
  - Install from: https://github.com/sun-guannan/VectCutAPI

### Writing Tools
- OpenAI GPT-4o for content generation
- HyperWrite WebView integration
  - Embedded full web interface at app.hyperwriteai.com
  - Access all HyperWrite features directly in-app
  - Users log in with their own HyperWrite account

### Floating AI Assistant
- **ChatGPT (GPT-4o)**: OpenAI's latest model via `EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY`
- **Google Gemini 2.0**: Google's advanced AI via `EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY`
- Instant access from any screen in the app
- Toggle between AI providers for different perspectives

## Setup Instructions

### Video Generation (Sora 2, Google Veo & Kling)
1. Open the **ENV tab** in Vibecode
2. Add your API keys:
   - For Sora 2.0: Add `EXPO_PUBLIC_OPENAI_API_KEY` (get from platform.openai.com)
   - For Google Veo: Add `EXPO_PUBLIC_GOOGLE_API_KEY` (get from ai.google.dev)
   - For Kling AI: Add **BOTH** keys from klingai.com:
     - `EXPO_PUBLIC_VIBECODE_KLING_ACCESS_KEY` (your Access Key)
     - `EXPO_PUBLIC_VIBECODE_KLING_SECRET_KEY` (your Secret Key)
3. Navigate to Video → Create and select your preferred model

**Note:** Video generation requires your own API keys from OpenAI, Google, and/or Kling, unlike image generation which uses Vibecode's internal API. Kling uses JWT token authentication and requires both Access Key and Secret Key.

### Video Editing & Stitching (Movie Maker)
1. Open the **ENV tab** in Vibecode
2. Add your JSON2Video API key:
   - Key name: `EXPO_PUBLIC_JSON2VIDEO_API_KEY`
   - Get your free API key at: https://json2video.com
3. Navigate to Video → Movie Maker
4. Create a project, add clips, set transitions, and tap "Create"
5. Your video will be automatically stitched with transitions in the cloud

**Alternative Options:**
- **CapCut API** (Advanced): Install local API server from GitHub for advanced editing
- **Export Clips** (Basic): Export numbered clips for manual editing in desktop software

**Note:** JSON2Video provides cloud-based video stitching with professional transitions, eliminating the need for FFmpeg on mobile devices.

## Recent Updates (Dec 2024)

The app uses a sleek dark studio theme with brushed nickel and wood accents:
- **Dark Foundation**: Deep blacks (#0d0d0d) and charcoal backgrounds
- **Brushed Nickel**: Metallic button accents with chrome highlights
- **Wood Tones**: Warm brown accents for action elements
- **Amber Glow**: Warm amber accent for active states and highlights
- **Animated Shimmer**: Title screen features animated shimmer effects

### Latest Changes
- **Video Editing Infrastructure**: Integrated JSON2Video and CapCut APIs for professional video stitching
- **Cloud-Based Rendering**: Automatic video creation with transitions using JSON2Video cloud API
- **Smart Method Detection**: App intelligently chooses best rendering method (Cloud API → CapCut → Export)
- **Real Video Stitching**: Actually creates stitched videos with transitions, not just exports clips
- **Progress Tracking**: Live progress updates during video rendering
- **Three-Tier System**: JSON2Video (recommended), CapCut API (advanced), Export Clips (fallback)
- **Drag-and-Drop Timeline**: Professional iMovie-style timeline editor with gesture-based clip reordering
- **Movie Maker Enhanced**: Complete rewrite with animated drag-and-drop, visual feedback, and haptic interactions
- **Timeline Gestures**: Pan gestures with spring animations and real-time position calculations
- **Fixed Video Library**: Video preview now properly switches when selecting different videos
- **Fixed Movie Maker Modal**: New Project modal now displays properly with full-screen form sheet presentation
- **Improved Navigation**: Navigation bar doubled in size (48px height) with larger icons (20-24px) for easier tapping
- **Enhanced Video Tab**: Added 4th tile for Movie Maker in Video Hub
- **Visual Clip Cards**: Each clip shows thumbnail placeholder, duration, order badge, remove button, and transition indicator

## Dependencies Used

- expo-av: Audio and video playback
- expo-file-system: File downloads and storage
- expo-sharing: Export files
- expo-clipboard: Copy/paste functionality
- expo-image: Optimized image display
- expo-media-library: Save media to device
- react-native-webview: Embedded web views
- react-native-reanimated: Animations
- react-native-gesture-handler: Gestures
- @react-navigation: Tab and stack navigation
- zustand: State management
- date-fns: Date formatting

## Theme

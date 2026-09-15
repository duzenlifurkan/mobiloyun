import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, FlatList, Image, KeyboardAvoidingView,
  Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { backendConfigured, backendConfigError } from './src/backend/supabase';
import { authService, profileService, storyService, coffeeService, adminService } from './src/backend/services';

// Fotoğraflar, profiller, fal sonuçları ve ödemeler bu MVP'de örnek veridir.
const T = {
  bg: '#1a0b2e', surface: '#29153e', elevated: '#38204f', border: '#59376d',
  white: '#faf6ff', muted: '#bbaacb', neon: '#d38dff', violet: '#a979ec',
  gold: '#f1ce89', goldDark: '#4c362d', pink: '#ff88b7', green: '#9be3c3',
};

const PHOTOS = [
  { id: 'p1', label: 'Ay ışığı', uri: 'https://picsum.photos/id/1003/800/800' },
  { id: 'p2', label: 'Doğa', uri: 'https://picsum.photos/id/1018/800/800' },
  { id: 'p3', label: 'Gün batımı', uri: 'https://picsum.photos/id/1039/800/800' },
  { id: 'p4', label: 'Yolculuk', uri: 'https://picsum.photos/id/1050/800/800' },
  { id: 'p5', label: 'Deniz', uri: 'https://picsum.photos/id/1011/800/800' },
  { id: 'p6', label: 'Çiçekler', uri: 'https://picsum.photos/id/106/800/800' },
  { id: 'p7', label: 'Gökyüzü', uri: 'https://picsum.photos/id/1016/800/800' },
  { id: 'p8', label: 'Orman', uri: 'https://picsum.photos/id/1043/800/800' },
];

const COFFEE_ANGLES = ['Ön', 'Arka', 'Sol', 'Sağ', 'Üst', 'Alt', 'Sap solu', 'Sap sağı'];
const CURRENT_ROLE = 'admin'; // Demo hesabı; gerçek yetki sunucuda doğrulanmalıdır.
const EXPERT_STYLES = [
  { id: 'aylin', name: 'Aylin', icon: 'moon-outline', detail: 'Sezgisel ve sıcak yorum' },
  { id: 'mira', name: 'Mira', icon: 'sparkles-outline', detail: 'Sembollere odaklanan yorum' },
  { id: 'luna', name: 'Luna', icon: 'star-outline', detail: 'Yol gösteren sakin yorum' },
];

const PEOPLE = [
  { id: 'ayse', name: 'Ayşe Yılmaz', initials: 'A', avatar: 'https://picsum.photos/id/1027/300/300', code: 'A7Y9S2M4P6Q8', private: false, bio: 'Tarot kartları ve yeni başlangıçlar ✨', color: '#a970b4' },
  { id: 'mert', name: 'Mert Demir', initials: 'M', avatar: 'https://picsum.photos/id/1005/300/300', code: 'M4D8R2T6K9L3', private: false, bio: 'Kahve, yıldızlar ve güzel sohbetler ☕', color: '#7c78bd' },
  { id: 'elif', name: 'Elif Kaya', initials: 'E', avatar: 'https://picsum.photos/id/1011/300/300', code: 'E5L2F9K7A4B8', private: false, bio: 'Her gün biraz daha ışık 💫', color: '#bc82a7' },
  { id: 'deniz', name: 'Deniz Arslan', initials: 'D', avatar: 'https://picsum.photos/id/1025/300/300', code: 'D6N4Z8A2R9S5', private: false, bio: 'Gökyüzünü okumayı seviyorum 🌙', color: '#728abc' },
  { id: 'selin', name: 'Selin Aksoy', initials: 'S', avatar: 'https://picsum.photos/id/1062/300/300', code: 'S3L1N9B8Q6R2', private: true, bio: 'Sadece davetle görünen bir dünya.', color: '#9a6aab' },
];
const asPerson = row => ({
  id: row.id, name: row.username, initials: row.username?.charAt(0)?.toUpperCase() || '✦',
  avatar: row.avatar_url, private: row.is_private, bio: row.role === 'falci' ? 'Falcı' : 'Üye',
  color: '#9068b4', ban_type: row.ban_type, admin_title: row.admin_title,
});

const START_POSTS = [
  { id: 'post1', authorId: 'ayse', text: 'Bugünkü tarot açılımımda Yıldız kartı çıktı. Umudu hatırlamak iyi geldi. ✨', photo: PHOTOS[0].uri, readingTitle: 'Ayşe’nin Tarot Açılımı', time: '12 dk', likes: 24 },
  { id: 'post2', authorId: 'mert', text: 'Fincanımda uzun bir yol belirdi. Bu hafta küçük bir kaçamak mı geliyor? ☕', photo: null, readingTitle: 'Mert’in Kahve Falı', time: '38 dk', likes: 18 },
  { id: 'post3', authorId: 'elif', text: 'Bugün kendime zaman ayırdım. Gökyüzü de güzel bir manzara sundu.', photo: PHOTOS[2].uri, time: '2 sa', likes: 41 },
  { id: 'post4', authorId: 'deniz', text: 'Yeni bir ay, yeni niyetler. Siz hangi dileğinizi tuttunuz?', photo: PHOTOS[4].uri, time: 'Dün', likes: 16 },
];

const START_COMMENTS = {
  post1: [{ id: 'c1', author: 'Mert', text: 'Harika bir kart! ✨' }],
  post2: [{ id: 'c2', author: 'Ayşe', text: 'Bence kesinlikle bir yolculuk var ☕' }],
};

const START_STORIES = [
  { id: 'story1', authorId: 'ayse', photo: PHOTOS[5].uri, text: 'Bugünün kartı: Yıldız ✨' },
  { id: 'story2', authorId: 'mert', photo: PHOTOS[1].uri, text: 'Kahve ve biraz huzur ☕' },
  { id: 'story3', authorId: 'elif', photo: PHOTOS[2].uri, text: 'Güzel bir akşam 🌙' },
  { id: 'story4', authorId: 'deniz', photo: PHOTOS[4].uri, text: 'Yeni bir dilek tuttum 💫' },
];

const READINGS = [
  { id: 'coffee', title: 'Kahve Falı', icon: 'cafe-outline', detail: 'Fincanındaki işaretleri keşfet', text: 'Fincanının dibindeki açık yol, uzun süredir ertelediğin bir kararın artık netleşmeye başladığını gösteriyor. Kenardaki kuş figürü, beklediğin haberin yakında gelebileceğini fısıldıyor. Bu haber kısa bir yolculuğun veya yeni bir tanışmanın kapısını açabilir. Kalbe benzeyen iz, yakın ilişkilerinde açık bir konuşmanın sana iyi geleceğini söylüyor. Küçük fırsatları görmezden gelme; içlerinden biri sana beklenmedik bir başlangıç sunabilir. Biraz yavaşlayıp sezgilerini dinlediğinde önündeki yol daha aydınlık görünecek. Bu yorum eğlence amaçlıdır.' },
  { id: 'tarot', title: 'Tarot', icon: 'albums-outline', detail: 'Kartların hikâyeni anlatsın', text: 'Bugünkü sembolik açılımında Yıldız, Güç ve Kupa Ası öne çıkıyor. Yıldız kartı umutlarını tazelemeyi, Güç kartı sakin kalarak ilerlemeyi anlatıyor. Kupa Ası ise duygusal hayatında içten bir başlangıcın mümkün olduğunu hatırlatıyor. Zihnini meşgul eden bir konu, dürüst bir sohbetle hafifleyebilir. Bütün seçenekleri bugün çözmek zorunda değilsin. İlk küçük adımını atman yeterli. Kendi sınırlarını koruduğunda yeni fırsatları daha rahat fark edecek ve kendine güvenin artacak. Bu yorum eğlence amaçlıdır.' },
  { id: 'stars', title: 'Yıldızname', icon: 'sparkles-outline', detail: 'Gökyüzünün fısıltılarını dinle', text: 'Gökyüzünün bugünkü sembolik haritasında yenilenme ve denge teması belirgin. İçinde büyüttüğün bir fikir artık paylaşılmaya hazır olabilir. Yakın çevrenden gelecek küçük bir destek, beklediğinden büyük bir cesaret verebilir. Aynı yerde dönüp durduğunu hissetsen de attığın adımlar birikiyor. İlişkilerde beklentilerini açıkça ifade etmek yanlış anlamaları azaltacak. Kendine dinlenmek için alan aç; parlak fikirler bazen sessizlikte belirir. Önümüzdeki günler niyetini berraklaştırmak ve yeni bir rota çizmek için güzel bir fırsat sunuyor. Bu yorum eğlence amaçlıdır.' },
];

const GROUPS = [
  { id: 'group_stars', name: 'Gece Yıldızları', initials: '✦', members: 4, color: '#8b63b6' },
  { id: 'group_coffee', name: 'Kahve Molası', initials: '☕', members: 3, color: '#a67c6b' },
];

const START_MESSAGES = {
  ayse: [
    { id: 'm1', mine: false, text: 'Merhaba! Bugünkü açılımımı gördün mü?', time: '14:30' },
    { id: 'm2', mine: false, kind: 'reading', title: 'Ayşe’nin Tarot Falı', text: 'Yıldız kartı umut ve yeni bir başlangıcı gösteriyor.', time: '14:31' },
  ],
  mert: [{ id: 'm3', mine: false, text: 'Fincanımda bir yol gördüm ☕', time: 'Dün' }],
  group_stars: [{ id: 'm4', mine: false, text: 'Bu akşam tarot açılımı yapalım mı?', time: '13:08' }],
  group_coffee: [{ id: 'm5', mine: false, text: 'Fincanlar hazır mı?', time: 'Dün' }],
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AppContext = createContext(null);
const useApp = () => useContext(AppContext);

function AppProvider({ children, session = null, serverProfile = null, onServerProfileChange = () => {} }) {
  const connected = Boolean(backendConfigured && session?.user && serverProfile);
  const role = connected ? serverProfile.role : CURRENT_ROLE;
  const [posts, setPosts] = useState(START_POSTS);
  const [comments, setComments] = useState(START_COMMENTS);
  const [likes, setLikes] = useState({});
  const [ownStories, setOwnStories] = useState([]);
  const [remoteStories, setRemoteStories] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [adminDirectory, setAdminDirectory] = useState([]);
  const [moderation, setModeration] = useState({ ayse: { penalty: 'none', title: 'Kral' } });
  const [friends, setFriends] = useState(connected ? [] : ['ayse', 'mert']);
  const [following, setFollowing] = useState([]);
  const [privateProfile, setPrivateProfileLocal] = useState(serverProfile?.is_private ?? false);
  const [profileCode, setProfileCode] = useState(serverProfile?.secret_code ?? 'X7B9K2M4L9Q1');
  const [ownAvatar, setOwnAvatarLocal] = useState(serverProfile?.avatar_url ?? PHOTOS[3].uri);
  const [messages, setMessages] = useState(START_MESSAGES);
  const [latestReading, setLatestReading] = useState(null);
  const people = connected ? [...PEOPLE, ...directory] : PEOPLE;
  const visiblePeople = connected ? directory : PEOPLE;
  const storyFeed = connected ? remoteStories : START_STORIES;
  const adminPeople = connected ? adminDirectory : PEOPLE;
  const coinBalance = connected ? serverProfile.token_balance : 150;
  const profileName = connected ? serverProfile.username : 'Sen';
  const ownBanType = connected ? serverProfile.ban_type : 'none';

  useEffect(() => {
    if (!connected) return;
    let active = true;
    const load = async () => {
      try {
        const [stories, visible, adminRows] = await Promise.all([
          storyService.list(), profileService.listVisible(),
          role === 'admin' ? adminService.listProfiles() : Promise.resolve([]),
        ]);
        if (!active) return;
        const mapped = stories.map(row => ({
          id: row.id, authorId: row.user_id === session.user.id ? 'me' : row.user_id,
          photo: row.display_url, text: row.caption || '',
        }));
        setOwnStories(mapped.filter(item => item.authorId === 'me'));
        setRemoteStories(mapped.filter(item => item.authorId !== 'me'));
        setDirectory(visible.filter(row => row.id !== session.user.id).map(asPerson));
        setAdminDirectory(adminRows.filter(row => row.id !== session.user.id).map(asPerson));
        const next = {};
        for (const row of [...visible, ...adminRows]) next[row.id] = {
          penalty: row.ban_type === 'full_ban' ? 'full' : row.ban_type === 'chat_only_ban' ? 'chat' : 'none',
          title: row.admin_title || '',
        };
        setModeration(old => ({ ...old, ...next }));
      } catch (error) { if (active) Alert.alert('Veri yüklenemedi', error.message); }
    };
    load();
    return () => { active = false; };
  }, [connected, session?.user?.id, role]);

  const addPost = ({ text, photo = null, readingTitle = null }) => {
    const clean = text.trim();
    if (!clean && !photo) return false;
    setPosts(old => [{ id: makeId(), authorId: 'me', text: clean, photo, readingTitle, time: 'Şimdi', likes: 0 }, ...old]);
    return true;
  };
  const addComment = (postId, text) => {
    const clean = text.trim();
    if (!clean) return;
    setComments(old => ({ ...old, [postId]: [...(old[postId] || []), { id: makeId(), author: 'Sen', text: clean }] }));
  };
  const changeCode = async () => {
    if (connected) {
      try {
        const data = await profileService.rotateCode();
        setProfileCode(data.secret_code);
        onServerProfileChange({ secret_code: data.secret_code });
      } catch (error) { Alert.alert('Kod yenilenemedi', error.message); }
      return;
    }
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let next;
    do {
      next = Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    } while (next === profileCode);
    setProfileCode(next);
  };
  const addFriend = id => setFriends(old => old.includes(id) ? old : [...old, id]);
  const addStory = async story => {
    if (!connected) { setOwnStories(old => [{ id: makeId(), authorId: 'me', ...story }, ...old]); return true; }
    try {
      const row = await storyService.create({ imageUri: story.photo, caption: story.text });
      setOwnStories(old => [{ id: row.id, authorId: 'me', photo: row.display_url, text: row.caption || '' }, ...old]);
      return true;
    } catch (error) { Alert.alert('Story kaydedilemedi', error.message); return false; }
  };
  const setPenalty = async (id, penalty) => {
    if (connected) {
      try {
        const row = await adminService.updateModeration(id, { banType: penalty === 'full' ? 'full_ban' : penalty === 'chat' ? 'chat_only_ban' : 'none' });
        setAdminDirectory(old => old.map(person => person.id === id ? asPerson(row) : person));
      } catch (error) { Alert.alert('Ceza güncellenemedi', error.message); return; }
    }
    setModeration(old => ({ ...old, [id]: { ...old[id], penalty } }));
  };
  const setTitle = async (id, title) => {
    if (connected) {
      try {
        const row = await adminService.updateModeration(id, { adminTitle: title || null });
        setAdminDirectory(old => old.map(person => person.id === id ? asPerson(row) : person));
      } catch (error) { Alert.alert('Ünvan güncellenemedi', error.message); return; }
    }
    setModeration(old => ({ ...old, [id]: { ...old[id], title } }));
  };
  const setPrivateProfile = async value => {
    if (connected) {
      try { await profileService.updateMine({ is_private: value }); onServerProfileChange({ is_private: value }); }
      catch (error) { Alert.alert('Gizlilik güncellenemedi', error.message); return; }
    }
    setPrivateProfileLocal(value);
  };
  const setOwnAvatar = async uri => {
    if (connected) {
      try {
        const row = await profileService.setAvatar(uri);
        setOwnAvatarLocal(row.avatar_url);
        onServerProfileChange({ avatar_url: row.avatar_url });
      } catch (error) { Alert.alert('Fotoğraf yüklenemedi', error.message); }
      return;
    }
    setOwnAvatarLocal(uri);
  };
  const toggleFollow = id => setFollowing(old => old.includes(id) ? old.filter(item => item !== id) : [...old, id]);
  const addMessage = (chatId, data) => setMessages(old => ({
    ...old, [chatId]: [...(old[chatId] || []), { id: makeId(), mine: true, time: 'Şimdi', ...data }],
  }));
  const sendStoryReply = async (story, message) => {
    if (connected) await storyService.reply(story.id, message);
    addMessage(story.authorId, { kind: 'story', title: 'Hikayeye yanıt', text: message });
  };

  return (
    <AppContext.Provider value={{
      posts, comments, likes, ownStories, storyFeed, people, visiblePeople, adminPeople, moderation,
      friends, following, privateProfile, role, connected, coinBalance, profileName, ownBanType,
      profileCode, ownAvatar, messages, latestReading, setLatestReading,
      addStory, setPenalty, setTitle, setPrivateProfile, setOwnAvatar, addPost, addComment,
      changeCode, addFriend, toggleFollow, addMessage, sendStoryReply,
      toggleLike: id => setLikes(old => ({ ...old, [id]: !old[id] })),
    }}>
      {children}
    </AppContext.Provider>
  );
}

function Screen({ children, style }) {
  return <SafeAreaView style={[styles.screen, style]}><StatusBar barStyle="light-content" backgroundColor={T.bg} />{children}</SafeAreaView>;
}

function Photo({ uri, style, icon = 'image-outline' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return (
    <View style={[styles.photo, style]}>
      {uri && !failed ? <Image source={{ uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" onError={() => setFailed(true)} /> : <Ionicons name={icon} size={28} color={T.muted} />}
    </View>
  );
}

function Avatar({ uri, initials = '✦', color = T.elevated, size = 46 }) {
  return uri ? <Photo uri={uri} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} icon="person-outline" /> : (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}><Text style={[styles.avatarInitial, { fontSize: size * 0.39 }]}>{initials}</Text></View>
  );
}

function Button({ title, icon, onPress, variant = 'gold', style, disabled }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, variant === 'outline' && styles.outlineButton, variant === 'subtle' && styles.subtleButton, disabled && styles.disabled, pressed && styles.pressed, style]}>
      {icon && <Ionicons name={icon} size={18} color={variant === 'gold' ? T.bg : T.gold} style={{ marginRight: 7 }} />}
      <Text style={[styles.buttonText, variant !== 'gold' && styles.outlineButtonText]}>{title}</Text>
    </Pressable>
  );
}

function UserBadges({ userId }) {
  const { moderation } = useApp();
  const state = moderation[userId] || {};
  if (!state.title && (!state.penalty || state.penalty === 'none')) return null;
  return <View style={styles.badgeRow}>
    {!!state.title && <Text style={styles.titleBadge}>✦ {state.title}</Text>}
    {state.penalty === 'full' && <Text style={styles.penaltyBadge}>Tam Ban</Text>}
    {state.penalty === 'chat' && <Text style={styles.penaltyBadge}>Sohbet Cezası</Text>}
  </View>;
}

function PhotoPicker({ visible, onClose, onSelect, title = 'Fotoğraf Seç', usedUris = [] }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <View style={styles.pickerSheet}>
          <View style={styles.sheetHeader}><Text style={styles.sectionTitle}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose}><Ionicons name="close" color={T.white} size={25} /></Pressable></View>
          <Text style={styles.mutedText}>MVP için örnek fotoğraflardan birini seç.</Text>
          <ScrollView contentContainerStyle={styles.photoGrid}>
            {PHOTOS.map(item => (
              <Pressable key={item.id} disabled={usedUris.includes(item.uri)} onPress={() => { onSelect(item.uri); onClose(); }} style={[styles.photoOption, usedUris.includes(item.uri) && styles.disabled]}>
                <Photo uri={item.uri} style={styles.photoOptionImage} />
                <Text style={styles.photoOptionLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FeedPost({ post }) {
  const { comments, likes, toggleLike, addComment, ownAvatar, people } = useApp();
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');
  const person = people.find(item => item.id === post.authorId);
  const name = person?.name || 'Sen';
  const avatar = person?.avatar || ownAvatar;
  const postComments = comments[post.id] || [];
  const submit = () => { if (!draft.trim()) return; addComment(post.id, draft); setDraft(''); setShowComments(true); };
  return (
    <View style={styles.postCard}>
      <View style={styles.postAuthor}><Avatar uri={avatar} size={43} /><View style={{ flex: 1, marginLeft: 10 }}><Text style={styles.name}>{name}</Text><UserBadges userId={post.authorId} /><Text style={styles.smallMuted}>{post.time} önce</Text></View><Ionicons name="ellipsis-horizontal" size={19} color={T.muted} /></View>
      {post.readingTitle && <View style={styles.readingBadge}><Ionicons name="sparkles" size={16} color={T.gold} /><Text style={styles.goldTiny}>{post.readingTitle}</Text></View>}
      {!!post.text && <Text style={styles.postText}>{post.text}</Text>}
      {post.photo && <Photo uri={post.photo} style={styles.postPhoto} />}
      <View style={styles.postStats}><Text style={styles.smallMuted}>{post.likes + Number(!!likes[post.id])} beğeni</Text><Text style={styles.smallMuted}>{postComments.length} yorum</Text></View>
      <View style={styles.postActions}>
        <Pressable accessibilityRole="button" onPress={() => toggleLike(post.id)} style={styles.postAction}><Ionicons name={likes[post.id] ? 'heart' : 'heart-outline'} size={20} color={likes[post.id] ? T.pink : T.muted} /><Text style={styles.actionText}>Beğen</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setShowComments(old => !old)} style={styles.postAction}><Ionicons name="chatbubble-outline" size={19} color={T.muted} /><Text style={styles.actionText}>Yorum Yap</Text></Pressable>
      </View>
      {showComments && (
        <View style={styles.commentsArea}>
          {postComments.map(comment => <View key={comment.id} style={styles.comment}><Text style={styles.commentAuthor}>{comment.author}</Text><Text style={styles.commentText}>{comment.text}</Text></View>)}
          <View style={styles.commentComposer}><TextInput value={draft} onChangeText={setDraft} onSubmitEditing={submit} placeholder="Yorum yaz..." placeholderTextColor={T.muted} style={styles.commentInput} /><Pressable accessibilityRole="button" accessibilityLabel="Yorum Gönder" onPress={submit}><Ionicons name="send" size={19} color={T.gold} /></Pressable></View>
        </View>
      )}
    </View>
  );
}

function FeedScreen({ navigation }) {
  const { posts, ownStories, storyFeed, people, ownAvatar, addStory, addPost, moderation } = useApp();
  const [composeOpen, setComposeOpen] = useState(false);
  const [photoPicker, setPhotoPicker] = useState(null);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null);
  const pickerTimer = useRef(null);
  useEffect(() => () => clearTimeout(pickerTimer.current), []);
  const openPostPicker = () => {
    setComposeOpen(false);
    pickerTimer.current = setTimeout(() => setPhotoPicker('post'), 320);
  };
  const closePhotoPicker = () => {
    const returnToComposer = photoPicker === 'post';
    setPhotoPicker(null);
    if (returnToComposer) pickerTimer.current = setTimeout(() => setComposeOpen(true), 320);
  };
  const publish = () => {
    if (!addPost({ text, photo })) return Alert.alert('Gönderi boş', 'Metin veya fotoğraf ekle.');
    setText(''); setPhoto(null); setComposeOpen(false);
  };
  const addStoryPhoto = uri => addStory({ photo: uri, text: 'Yeni hikayem ✨' });
  const storyList = [{ id: 'add', authorId: 'me' }, ...ownStories, ...storyFeed.filter(story => moderation[story.authorId]?.penalty !== 'full')];
  return (
    <Screen>
      <FlatList data={posts.filter(post => moderation[post.authorId]?.penalty !== 'full')} keyExtractor={item => item.id} renderItem={({ item }) => <FeedPost post={item} />} contentContainerStyle={styles.feedList} showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.pageHeader}><View><Text style={styles.eyebrow}>✦  MİSTİK DÜNYAN</Text><Text style={styles.title}>Ana Akış</Text></View><Ionicons name="moon" size={28} color={T.gold} /></View>
            <Text style={styles.sectionTitle}>Hikayeler</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
              {storyList.map(story => {
                const person = people.find(item => item.id === story.authorId);
                const mine = story.authorId === 'me';
                const isAdd = story.id === 'add';
                return (
                  <View key={story.id} style={styles.storyItem}>
                    <Pressable accessibilityRole="button" onPress={() => isAdd ? setPhotoPicker('story') : navigation.getParent()?.navigate('Story', { storyId: story.id })} style={[styles.storyRing, mine && styles.storyRingMine]}>
                      <Avatar uri={mine ? ownAvatar : person?.avatar} initials={mine ? '✦' : person?.initials} size={57} />
                    </Pressable>
                    {isAdd && <Pressable accessibilityRole="button" accessibilityLabel="Hikayeye Fotoğraf Ekle" onPress={() => setPhotoPicker('story')} style={styles.storyPlus}><Ionicons name="add" size={17} color={T.bg} /></Pressable>}
                    <Text numberOfLines={1} style={styles.storyLabel}>{isAdd ? 'Hikaye Ekle' : mine ? 'Hikayem' : person?.name.split(' ')[0]}</Text>
                  </View>
                );
              })}
            </ScrollView>
            <Button title="Hikayeye Fotoğraf Ekle" icon="images-outline" variant="outline" onPress={() => setPhotoPicker('story')} style={{ marginBottom: 20 }} />
            <View style={styles.composerCard}><Avatar uri={ownAvatar} size={42} /><Pressable accessibilityRole="button" onPress={() => setComposeOpen(true)} style={styles.composePrompt}><Text style={styles.mutedText}>Ne düşünüyorsun?</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Fotoğraf Ekle" onPress={() => setPhotoPicker('post')}><Ionicons name="image-outline" size={23} color={T.gold} /></Pressable></View>
            <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>Haber Kaynağı</Text>
          </>
        }
      />
      <Modal visible={composeOpen} animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <Screen>
          <View style={styles.composeHeader}><Pressable onPress={() => setComposeOpen(false)}><Ionicons name="close" size={25} color={T.white} /></Pressable><Text style={styles.sectionTitle}>Gönderi Oluştur</Text><Pressable onPress={publish}><Text style={styles.goldLink}>Paylaş</Text></Pressable></View>
          <ScrollView contentContainerStyle={styles.composeBody}>
            <View style={styles.postAuthor}><Avatar uri={ownAvatar} /><Text style={[styles.name, { marginLeft: 12 }]}>Sen</Text></View>
            <TextInput value={text} onChangeText={setText} multiline placeholder="Ne düşünüyorsun?" placeholderTextColor={T.muted} style={styles.postInput} />
            {photo && <Photo uri={photo} style={styles.composePhoto} />}
            <Button title={photo ? 'Fotoğrafı Değiştir' : 'Fotoğraf Ekle'} icon="image-outline" variant="outline" onPress={openPostPicker} />
            {photo && <Pressable onPress={() => setPhoto(null)} style={styles.removePhoto}><Text style={styles.smallMuted}>Fotoğrafı kaldır</Text></Pressable>}
          </ScrollView>
        </Screen>
      </Modal>
      <PhotoPicker visible={!!photoPicker} title={photoPicker === 'story' ? 'Hikayeye Fotoğraf Ekle' : 'Gönderiye Fotoğraf Ekle'} onClose={closePhotoPicker} onSelect={uri => photoPicker === 'story' ? addStoryPhoto(uri) : setPhoto(uri)} />
    </Screen>
  );
}

function StoryScreen({ navigation, route }) {
  const { ownStories, storyFeed, people, sendStoryReply, moderation, ownBanType } = useApp();
  const [reply, setReply] = useState('');
  const story = [...ownStories, ...storyFeed].find(item => item.id === route.params.storyId);
  if (!story) return null;
  const person = people.find(item => item.id === story.authorId);
  const canReply = !!person && ownBanType === 'none' && moderation[person.id]?.penalty !== 'full' && moderation[person.id]?.penalty !== 'chat';
  const sendReply = async () => {
    if (!reply.trim() || !canReply) return;
    try {
      await sendStoryReply(story, reply.trim());
      setReply('');
      Alert.alert('DM gönderildi', `${person.name} ile sohbetine eklendi.`);
    } catch (error) { Alert.alert('DM gönderilemedi', error.message); }
  };
  return (
    <Screen style={styles.storyScreen}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Photo uri={story.photo} style={styles.storyFullPhoto} />
      <View style={styles.storyOverlay} />
      <View style={styles.storyProgress} />
      <View style={styles.storyTop}><Avatar uri={person?.avatar} initials={person?.initials || '✦'} size={39} /><View style={{ flex: 1, marginLeft: 10 }}><Text style={styles.name}>{person?.name || 'Sen'}</Text>{person && <UserBadges userId={person.id} />}</View><Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={() => navigation.goBack()}><Ionicons name="close" size={27} color={T.white} /></Pressable></View>
      <View style={styles.storyCenter}><Text style={styles.storyText}>{story.text}</Text></View>
      {person && <View style={styles.storyReply}><TextInput value={reply} onChangeText={setReply} editable={canReply} placeholder={canReply ? 'Hikayeye DM gönder...' : 'Bu kullanıcıya mesaj gönderilemiyor'} placeholderTextColor={T.muted} style={styles.storyReplyInput} /><Pressable accessibilityRole="button" accessibilityLabel="Story’ye Yanıt Gönder" disabled={!canReply} onPress={sendReply} style={[styles.sendButton, !canReply && styles.disabled]}><Ionicons name="send" size={18} color={T.bg} /></Pressable></View>}
      <Text style={styles.storyFooter}>✦  ANINI PAYLAŞ  ✦</Text>
    </KeyboardAvoidingView></Screen>
  );
}

function ReadingScreen({ navigation }) {
  const { addPost, addStory, setLatestReading, connected } = useApp();
  const [stage, setStage] = useState('choose');
  const [selected, setSelected] = useState(null);
  const [coffeePhotos, setCoffeePhotos] = useState(Array(8).fill(null));
  const [expertId, setExpertId] = useState(null);
  const [photoAngle, setPhotoAngle] = useState(null);
  const timer = useRef(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (stage !== 'loading') return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.15, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [stage, pulse]);
  const begin = reading => {
    clearTimeout(timer.current); setSelected(reading); setStage('loading'); fade.setValue(0);
    timer.current = setTimeout(() => { setLatestReading(reading); setStage('result'); Animated.timing(fade, { toValue: 1, duration: 550, useNativeDriver: true }).start(); }, 2400);
  };
  const chooseReading = reading => {
    if (reading.id === 'coffee') { setSelected(reading); setStage('coffee'); return; }
    begin(reading);
  };
  const startCoffee = async () => {
    if (coffeePhotos.some(uri => !uri)) return Alert.alert('8 açı gerekli', 'Fincanın tam 8 farklı açısı için birer fotoğraf seç.');
    if (!expertId) return Alert.alert('Yorum stili seç', 'AI destekli yorum stilini seç.');
    if (connected) {
      setStage('submitting');
      try { await coffeeService.create({ photoUris: coffeePhotos, expertStyle: expertId }); }
      catch (error) { setStage('coffee'); Alert.alert('Talep kaydedilemedi', error.message); return; }
    }
    begin(selected);
  };
  const shareFeed = () => { addPost({ text: selected.text, readingTitle: `Benim ${selected.title} Falım` }); Alert.alert('Paylaşıldı', 'Falın haber kaynağına eklendi.'); };
  const shareStory = async () => { if (await addStory({ photo: PHOTOS[0].uri, text: `${selected.title}: ${selected.text}` })) Alert.alert('Paylaşıldı', 'Falın story’ne eklendi.'); };
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.readingPage} showsVerticalScrollIndicator={false}>
        <View style={styles.readingHero}><View style={styles.moonOrb}><Ionicons name="moon" size={34} color={T.gold} /></View><Text style={styles.eyebrow}>YILDIZLARIN FISILTISI</Text><Text style={styles.title}>Fal Bak</Text><Text style={styles.centerMuted}>Bir kapı seç, hikâyeni keşfet.</Text></View>
        {stage === 'choose' && READINGS.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => chooseReading(item)} style={({ pressed }) => [styles.readingChoice, pressed && styles.pressed]}><View style={styles.readingChoiceIcon}><Ionicons name={item.icon} size={28} color={T.gold} /></View><View style={{ flex: 1 }}><Text style={styles.name}>{item.title}</Text><Text style={styles.smallMuted}>{item.detail}</Text></View><Ionicons name="chevron-forward" size={19} color={T.neon} /></Pressable>)}
        {stage === 'coffee' && <View>
          <Text style={styles.sectionTitle}>Fincanın 8 açısı</Text>
          <Text style={styles.mutedText}>Mock galeriden her açı için farklı bir görsel seç: {coffeePhotos.filter(Boolean).length}/8 tamamlandı. Bir görseli silmek için basılı tut.</Text>
          <View style={styles.angleGrid}>{COFFEE_ANGLES.map((angle, index) => <Pressable key={angle} accessibilityRole="button" accessibilityLabel={`${angle} açı fotoğrafı`} onPress={() => setPhotoAngle(index)} onLongPress={() => setCoffeePhotos(old => old.map((uri, slot) => slot === index ? null : uri))} style={styles.angleSlot}>{coffeePhotos[index] ? <Photo uri={coffeePhotos[index]} style={styles.anglePhoto} /> : <Ionicons name="camera-outline" size={24} color={T.gold} />}<Text style={styles.angleLabel}>{index + 1}. {angle}</Text></Pressable>)}</View>
          <Text style={styles.sectionTitle}>Yorum stilini seç</Text>
          <Text style={styles.mutedText}>Bu stiller yapay zekâ tarafından oluşturulur; gerçek bir uzman yorumu değildir.</Text>
          {EXPERT_STYLES.map(expert => <Pressable key={expert.id} accessibilityRole="radio" accessibilityState={{ checked: expertId === expert.id }} onPress={() => setExpertId(expert.id)} style={[styles.expertCard, expertId === expert.id && styles.expertSelected]}><Ionicons name={expert.icon} size={25} color={T.gold} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.name}>{expert.name}</Text><Text style={styles.smallMuted}>{expert.detail} · AI destekli</Text></View><Ionicons name={expertId === expert.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={T.gold} /></Pressable>)}
          <Button title="AI Destekli Falı Yorumla" icon="sparkles-outline" onPress={startCoffee} style={{ marginTop: 14 }} />
          <Pressable onPress={() => setStage('choose')} style={styles.again}><Text style={styles.smallMuted}>Fal seçimine dön</Text></Pressable>
        </View>}
        {stage === 'loading' && <View style={styles.analysisCard}><Animated.View style={[styles.analysisOrb, { transform: [{ scale: pulse }] }]}><Ionicons name="sparkles" size={39} color={T.gold} /></Animated.View><ActivityIndicator size="large" color={T.neon} /><Text style={[styles.name, { marginTop: 22 }]}>Yapay zeka falınızı yorumluyor...</Text><Text style={styles.centerMuted}>Semboller bir araya geliyor.</Text></View>}
        {stage === 'submitting' && <View style={styles.analysisCard}><ActivityIndicator size="large" color={T.neon} /><Text style={[styles.name, { marginTop: 22 }]}>8 fotoğraf güvenle yükleniyor...</Text></View>}
        {stage === 'result' && selected && <Animated.View style={{ opacity: fade }}><View style={styles.resultCard}><View style={styles.readingBadge}><Ionicons name={selected.icon} color={T.gold} size={19} /><Text style={styles.goldTiny}>AI DESTEKLİ DEMO YORUM</Text></View><Text style={styles.resultTitle}>{selected.title}</Text>{selected.id === 'coffee' && <Text style={styles.mutedText}>{EXPERT_STYLES.find(item => item.id === expertId)?.name} yorum stili</Text>}{connected && selected.id === 'coffee' && <Text style={styles.mutedText}>Fal talebin veritabanında sıraya alındı; aşağıdaki metin örnek yorumdur.</Text>}<View style={styles.divider} /><Text style={styles.resultText}>{selected.text}</Text></View><Button title="Haber Kaynağımda Paylaş" icon="newspaper-outline" onPress={shareFeed} /><Button title="Story'mde Paylaş" icon="images-outline" variant="outline" onPress={shareStory} style={{ marginTop: 10 }} /><Pressable onPress={() => { setStage('choose'); setSelected(null); }} style={styles.again}><Text style={styles.smallMuted}>Başka bir fal seç</Text></Pressable></Animated.View>}
      </ScrollView>
      <PhotoPicker visible={photoAngle !== null} title={photoAngle === null ? 'Fincan Fotoğrafı Seç' : `${COFFEE_ANGLES[photoAngle]} açı fotoğrafı`} usedUris={coffeePhotos.filter(Boolean)} onClose={() => setPhotoAngle(null)} onSelect={uri => setCoffeePhotos(old => old.map((item, index) => index === photoAngle ? uri : item))} />
    </Screen>
  );
}

function FriendRow({ person, isFriend, isFollowing, onOpen, onAdd, onFollow }) {
  return (
    <View style={styles.friendRow}><Pressable accessibilityRole="button" onPress={onOpen} style={styles.friendIdentity}><Avatar uri={person.avatar} initials={person.initials} size={54} /><View style={{ flex: 1, marginLeft: 11 }}><Text numberOfLines={1} style={styles.name}>{person.name}</Text><UserBadges userId={person.id} /><Text numberOfLines={1} style={styles.smallMuted}>{person.private ? 'Özel profil' : person.bio}</Text></View></Pressable><View style={styles.friendButtons}>{!isFriend && <Pressable accessibilityRole="button" accessibilityLabel="Arkadaş Ekle" onPress={onAdd} style={styles.miniGold}><Ionicons name="person-add-outline" size={17} color={T.bg} /></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel={isFollowing ? 'Takibi Bırak' : 'Takip Et'} onPress={onFollow} style={styles.miniOutline}><Ionicons name={isFollowing ? 'checkmark' : 'add'} size={18} color={T.gold} /></Pressable></View></View>
  );
}

function FriendsScreen({ navigation }) {
  const { friends, following, addFriend, toggleFollow, visiblePeople, connected } = useApp();
  const [codeInput, setCodeInput] = useState('');
  const [found, setFound] = useState(null);
  const [searchMessage, setSearchMessage] = useState('');
  const open = (person, viaCode = false) => navigation.navigate('FriendProfile', { personId: person.id, viaCode, person });
  const search = async () => {
    const code = codeInput.trim().toUpperCase();
    if (code.length !== 12) { setFound(null); setSearchMessage('Kod tam 12 karakter olmalı.'); return; }
    try {
      const match = connected ? await profileService.findByCode(code) : visiblePeople.find(person => person.code === code);
      setFound(match ? (connected ? asPerson(match) : match) : null);
      setSearchMessage(match ? 'Kodla bulunan profil' : 'Bu kodla eşleşen profil bulunamadı.');
    } catch (error) { setFound(null); setSearchMessage(error.message); }
  };
  const row = (person, viaCode = false) => <FriendRow key={person.id} person={person} isFriend={friends.includes(person.id)} isFollowing={following.includes(person.id)} onOpen={() => open(person, viaCode)} onAdd={() => addFriend(person.id)} onFollow={() => toggleFollow(person.id)} />;
  return (
    <Screen><ScrollView contentContainerStyle={styles.friendsPage} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={() => navigation.goBack()} style={styles.friendBack}><Ionicons name="arrow-back" size={23} color={T.white} /><Text style={styles.smallMuted}>Story & DM</Text></Pressable>
      <Text style={styles.eyebrow}>MİSTİK ÇEVREN</Text><Text style={styles.title}>Arkadaşlar</Text>
      <View style={styles.searchCard}><Text style={styles.sectionTitle}>Gizli Kod ile Arkadaş Ara</Text><Text style={styles.mutedText}>Özel profiller yalnızca doğru 12 haneli kodla bulunur.</Text><View style={styles.searchRow}><TextInput value={codeInput} onChangeText={value => setCodeInput(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))} onSubmitEditing={search} autoCapitalize="characters" maxLength={12} placeholder="12 haneli gizli kod" placeholderTextColor={T.muted} style={styles.searchInput} /><Pressable accessibilityRole="button" accessibilityLabel="Kodla Ara" onPress={search} style={styles.searchButton}><Ionicons name="search" size={21} color={T.bg} /></Pressable></View><Text style={styles.codeCounter}>{codeInput.length}/12</Text>{!!searchMessage && <Text style={styles.searchMessage}>{searchMessage}</Text>}{found && row(found, true)}</View>
      <Text style={styles.sectionTitle}>Arkadaşlarım · {friends.length}</Text><View style={{ marginTop: 13, marginBottom: 22 }}>{visiblePeople.filter(person => friends.includes(person.id)).map(person => row(person))}</View>
      <Text style={styles.sectionTitle}>Önerilen Kişiler</Text><Text style={styles.mutedText}>Herkese açık profiller burada görünür. Arkadaşlık işlemleri bu sürümde yerel demodur.</Text><View style={{ marginTop: 13 }}>{visiblePeople.filter(person => !person.private && !friends.includes(person.id)).map(person => row(person))}</View>
    </ScrollView></Screen>
  );
}

function FriendProfileScreen({ route }) {
  const { friends, following, addFriend, toggleFollow, posts, moderation, people } = useApp();
  const person = route.params.person || people.find(item => item.id === route.params.personId);
  if (!person) return null;
  const isFriend = friends.includes(person.id);
  if (person.private && !isFriend && !route.params.viaCode) return <Screen><View style={styles.blocked}><Ionicons name="lock-closed" size={40} color={T.gold} /><Text style={styles.title}>Özel Profil</Text><Text style={styles.centerMuted}>Bu profil yalnızca gizli kodla bulunabilir.</Text></View></Screen>;
  const penalty = moderation[person.id]?.penalty || 'none';
  const personPosts = penalty === 'full' ? [] : posts.filter(post => post.authorId === person.id);
  return (
    <Screen><ScrollView contentContainerStyle={styles.detailPage}><Photo uri={PHOTOS[1].uri} style={styles.profileCover} /><View style={styles.detailAvatar}><Avatar uri={person.avatar} initials={person.initials} size={88} /></View><Text style={styles.detailName}>{person.name}</Text><View style={{ alignItems: 'center' }}><UserBadges userId={person.id} /></View><Text style={styles.centerMuted}>{person.bio}</Text>{penalty !== 'none' && <View style={styles.penaltyNotice}><Ionicons name="alert-circle-outline" size={19} color={T.gold} /><Text style={styles.penaltyNoticeText}>Aktif ceza: {penalty === 'full' ? 'Tam Ban' : 'Sohbet Cezası'}</Text></View>}<View style={styles.detailButtons}><Button title={isFriend ? 'Arkadaşsınız' : 'Arkadaş Ekle'} icon={isFriend ? 'checkmark' : 'person-add-outline'} onPress={() => addFriend(person.id)} disabled={isFriend || penalty === 'full'} style={{ flex: 1 }} /><Button title={following.includes(person.id) ? 'Takip Ediliyor' : 'Takip Et'} icon="add" variant="outline" onPress={() => toggleFollow(person.id)} disabled={penalty === 'full'} style={{ flex: 1 }} /></View><Text style={[styles.sectionTitle, { marginBottom: 14 }]}>Gönderileri</Text>{personPosts.length ? personPosts.map(post => <FeedPost key={post.id} post={post} />) : <Text style={styles.mutedText}>{penalty === 'full' ? 'Tam Ban nedeniyle gönderiler gizlendi.' : 'Henüz gönderi yok.'}</Text>}</ScrollView></Screen>
  );
}

function StoryDmScreen({ navigation }) {
  const { ownStories, storyFeed, people, ownAvatar, addStory, moderation } = useApp();
  const [mode, setMode] = useState('stories');
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState(null);
  const [picker, setPicker] = useState(false);
  const stories = [...ownStories, ...storyFeed.filter(story => moderation[story.authorId]?.penalty !== 'full')];
  const publish = async () => {
    if (!draft.trim() && !photo) return Alert.alert('Story boş', 'Bir metin veya fotoğraf ekle.');
    if (await addStory({ text: draft.trim(), photo })) { setDraft(''); setPhoto(null); }
  };
  return <Screen>
    <View style={styles.storyDmHeader}><Text style={styles.eyebrow}>ANLAR VE SOHBETLER</Text><Text style={styles.title}>Story & DM</Text><Pressable accessibilityRole="button" onPress={() => navigation.getParent()?.navigate('Friends')} style={styles.friendShortcut}><Ionicons name="people-outline" size={18} color={T.gold} /><Text style={styles.codeChangeText}>Arkadaş Bul</Text></Pressable><View style={styles.segment}>{[['stories', 'Story'], ['chats', 'DM & Gruplar']].map(([key, label]) => <Pressable key={key} onPress={() => setMode(key)} style={[styles.segmentItem, mode === key && styles.segmentSelected]}><Text style={[styles.segmentText, mode === key && styles.segmentTextSelected]}>{label}</Text></Pressable>)}</View></View>
    {mode === 'chats' ? <ChatsScreen navigation={navigation} /> : <ScrollView contentContainerStyle={styles.storyDmContent} keyboardShouldPersistTaps="handled">
      <View style={styles.storyComposer}><View style={styles.postAuthor}><Avatar uri={ownAvatar} size={42} /><Text style={[styles.name, { marginLeft: 10 }]}>Yeni story</Text></View><TextInput value={draft} onChangeText={setDraft} multiline placeholder="Story'ne bir şey yaz..." placeholderTextColor={T.muted} style={styles.storyDraft} />{photo && <Photo uri={photo} style={styles.storyDraftPhoto} />}<View style={styles.storyComposerActions}><Button title="Fotoğraf Ekle" icon="image-outline" variant="outline" onPress={() => setPicker(true)} style={{ flex: 1 }} /><Button title="Story Paylaş" icon="add-circle-outline" onPress={publish} style={{ flex: 1 }} /></View></View>
      <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Hikayeler · {stories.length}</Text>
      {stories.map(story => { const person = people.find(item => item.id === story.authorId); return <Pressable key={story.id} accessibilityRole="button" onPress={() => navigation.getParent()?.navigate('Story', { storyId: story.id })} style={styles.storyListCard}><Photo uri={story.photo} style={styles.storyListPhoto} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.name}>{person?.name || 'Sen'}</Text>{person && <UserBadges userId={person.id} />}<Text numberOfLines={2} style={styles.smallMuted}>{story.text || 'Fotoğraflı hikaye'}</Text></View><Ionicons name="chevron-forward" size={18} color={T.neon} /></Pressable>; })}
    </ScrollView>}
    <PhotoPicker visible={picker} title="Story Fotoğrafı Seç" onClose={() => setPicker(false)} onSelect={setPhoto} />
  </Screen>;
}

function ChatBubble({ message }) {
  return <View style={[styles.bubble, message.mine ? styles.myBubble : styles.theirBubble, message.kind === 'reading' && styles.falBubble]}>{message.kind === 'reading' && <Text style={styles.goldTiny}>✦ PAYLAŞILAN FAL</Text>}{message.title && <Text style={styles.bubbleTitle}>{message.title}</Text>}<Text style={styles.bubbleText}>{message.text}</Text><Text style={styles.bubbleTime}>{message.time}</Text></View>;
}

function ChatsScreen({ navigation }) {
  const { friends, messages, moderation, people } = useApp();
  const [mode, setMode] = useState('people');
  const list = mode === 'people' ? people.filter(person => (friends.includes(person.id) || messages[person.id]?.length) && moderation[person.id]?.penalty !== 'full') : GROUPS;
  return <View style={{ flex: 1 }}><View style={styles.chatsHeader}><Text style={styles.eyebrow}>BAĞLANTILARIN</Text><Text style={styles.title}>Sohbetler</Text><View style={styles.segment}>{[['people', 'Kişiler'], ['groups', 'Gruplar (Min 3 Kişi)']].map(([key, label]) => <Pressable key={key} onPress={() => setMode(key)} style={[styles.segmentItem, mode === key && styles.segmentSelected]}><Text style={[styles.segmentText, mode === key && styles.segmentTextSelected]}>{label}</Text></Pressable>)}</View></View><FlatList data={list} keyExtractor={item => item.id} contentContainerStyle={styles.chatList} renderItem={({ item }) => { const last = (messages[item.id] || []).slice(-1)[0]; return <Pressable accessibilityRole="button" onPress={() => navigation.getParent()?.navigate('ChatRoom', { chatId: item.id, title: item.name })} style={styles.chatRow}><Avatar uri={item.avatar} initials={item.initials} color={item.color} size={53} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.name}>{item.name}</Text><Text numberOfLines={1} style={styles.smallMuted}>{mode === 'groups' ? `${item.members} kişi · ` : ''}{last?.text || 'Sohbete başla'}</Text></View><Ionicons name="chevron-forward" size={18} color={T.muted} /></Pressable>; }} /></View>;
}

function ChatRoomScreen({ route }) {
  const { messages, addMessage, moderation, ownBanType } = useApp();
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);
  const penalty = ownBanType !== 'none' ? (ownBanType === 'chat_only_ban' ? 'chat' : 'full') : (moderation[route.params.chatId]?.penalty || 'none');
  const send = () => { const text = draft.trim(); if (!text || penalty !== 'none') return; addMessage(route.params.chatId, { text }); setDraft(''); };
  return <Screen><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 86 : 0}><FlatList ref={listRef} data={messages[route.params.chatId] || []} keyExtractor={item => item.id} renderItem={({ item }) => <ChatBubble message={item} />} contentContainerStyle={styles.messageList} onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })} />{penalty !== 'none' && <Text style={styles.chatPenalty}>Aktif ceza: {penalty === 'full' ? 'Tam Ban' : 'Sohbet Cezası'} · DM kapalı</Text>}<View style={styles.chatComposer}><TextInput value={draft} onChangeText={setDraft} editable={penalty === 'none'} placeholder={penalty === 'none' ? 'Mesaj yaz...' : 'Bu sohbete mesaj gönderilemiyor'} placeholderTextColor={T.muted} style={styles.chatInput} multiline /><Pressable accessibilityRole="button" accessibilityLabel="Mesaj Gönder" disabled={penalty !== 'none'} onPress={send} style={[styles.sendButton, penalty !== 'none' && styles.disabled]}><Ionicons name="send" color={T.bg} size={19} /></Pressable></View></KeyboardAvoidingView></Screen>;
}

function AdminScreen({ navigation }) {
  const { moderation, setPenalty, setTitle, adminPeople, role, connected } = useApp();
  if (role !== 'admin') return <Screen><View style={styles.blocked}><Ionicons name="lock-closed" size={42} color={T.gold} /><Text style={styles.title}>Erişim Yok</Text><Text style={styles.centerMuted}>Bu alan yalnızca admin kullanıcılarına açıktır.</Text></View></Screen>;
  const banned = adminPeople.filter(person => moderation[person.id]?.penalty === 'full').length;
  const chatMuted = adminPeople.filter(person => moderation[person.id]?.penalty === 'chat').length;
  return <Screen><ScrollView contentContainerStyle={styles.adminPage}>
    <View style={styles.adminHeader}><Ionicons name="shield-checkmark" size={31} color={T.gold} /><Text style={styles.eyebrow}>YÖNETİM ALANI</Text><Text style={styles.title}>Admin Paneli</Text><Text style={styles.mutedText}>{connected ? 'Cezalar ve ünvanlar Supabase üzerinde güncellenir.' : "Bu ekrandaki cezalar ve ünvanlar yerel demo state'inde tutulur."}</Text></View>
    <View style={styles.adminStats}><View style={styles.adminStat}><Text style={styles.adminStatValue}>{adminPeople.length}</Text><Text style={styles.smallMuted}>Kullanıcı</Text></View><View style={styles.adminStat}><Text style={styles.adminStatValue}>{banned}</Text><Text style={styles.smallMuted}>Tam Ban</Text></View><View style={styles.adminStat}><Text style={styles.adminStatValue}>{chatMuted}</Text><Text style={styles.smallMuted}>Sohbet Cezası</Text></View></View>
    <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>Kullanıcı Yönetimi</Text>
    {adminPeople.map(person => { const state = moderation[person.id] || {}; return <View key={person.id} style={styles.adminCard}>
      <Pressable accessibilityRole="button" onPress={() => navigation.getParent()?.navigate('FriendProfile', { personId: person.id, viaCode: true })} style={styles.adminPerson}><Avatar uri={person.avatar} size={47} /><View style={{ flex: 1, marginLeft: 11 }}><Text style={styles.name}>{person.name}</Text><UserBadges userId={person.id} /><Text style={styles.smallMuted}>Durum: {state.penalty === 'full' ? 'Tam Ban' : state.penalty === 'chat' ? 'Sohbet Cezası' : 'Aktif'}</Text></View><Ionicons name="chevron-forward" size={18} color={T.muted} /></Pressable>
      <Text style={styles.adminLabel}>Ceza türü</Text><View style={styles.adminActions}><Pressable onPress={() => setPenalty(person.id, 'full')} style={[styles.adminChip, state.penalty === 'full' && styles.adminChipActive]}><Text style={styles.adminChipText}>Tam Ban</Text></Pressable><Pressable onPress={() => setPenalty(person.id, 'chat')} style={[styles.adminChip, state.penalty === 'chat' && styles.adminChipActive]}><Text style={styles.adminChipText}>Sohbet Cezası</Text></Pressable><Pressable onPress={() => setPenalty(person.id, 'none')} style={[styles.adminChip, (!state.penalty || state.penalty === 'none') && styles.adminChipActive]}><Text style={styles.adminChipText}>Cezayı Kaldır</Text></Pressable></View>
      <Text style={styles.adminLabel}>Özel ünvan</Text><View style={styles.adminActions}>{['Yok', 'Dilenci', 'Kral', 'Yıldız'].map(title => <Pressable key={title} onPress={() => setTitle(person.id, title === 'Yok' ? '' : title)} style={[styles.adminChip, (state.title || '') === (title === 'Yok' ? '' : title) && styles.adminChipActive]}><Text style={styles.adminChipText}>{title}</Text></Pressable>)}</View>
    </View>; })}
  </ScrollView></Screen>;
}

function ProfileScreen({ navigation }) {
  const { ownAvatar, setOwnAvatar, friends, privateProfile, setPrivateProfile, profileCode, changeCode, posts, coinBalance, connected, profileName, ownBanType } = useApp();
  const [picker, setPicker] = useState(false);
  const myPosts = posts.filter(post => post.authorId === 'me');
  return <Screen><ScrollView contentContainerStyle={styles.profilePage}>
    <View style={styles.profileHero}><Avatar uri={ownAvatar} size={88} /><Pressable accessibilityRole="button" accessibilityLabel="Profil Fotoğrafını Değiştir" onPress={() => setPicker(true)} style={styles.cameraButton}><Ionicons name="camera" size={17} color={T.bg} /></Pressable><Text style={styles.eyebrow}>KİŞİSEL ALANIN</Text><Text style={styles.title}>{profileName}</Text><Text style={styles.mutedText}>Toplam Arkadaş: {connected ? friends.length : 40 + friends.length}{connected ? ' (demo)' : ''}</Text></View>
    {ownBanType !== 'none' && <View style={styles.penaltyNotice}><Ionicons name="alert-circle-outline" size={19} color={T.gold} /><Text style={styles.penaltyNoticeText}>Aktif ceza: {ownBanType === 'chat_only_ban' ? 'Sohbet Cezası' : 'Tam Ban'}</Text></View>}
    <Button title="Profil Fotoğrafını Değiştir" icon="camera-outline" variant="outline" onPress={() => setPicker(true)} style={{ marginBottom: 18 }} />
    <View style={styles.coinCard}><View style={styles.coinIcon}><Ionicons name="diamond" size={25} color={T.gold} /></View><View style={{ flex: 1 }}><Text style={styles.goldTiny}>JETON BAKİYESİ</Text><Text style={styles.coinAmount}>{coinBalance}</Text></View><Pressable accessibilityRole="button" onPress={() => navigation.getParent()?.navigate('Purchase')} style={styles.buyButton}><Text style={styles.buyButtonText}>Jeton Satın Al</Text><Text style={styles.buyButtonSub}>(Apple/Google Pay)</Text></Pressable></View>
    <View style={styles.privacyCard}><View style={styles.privacyRow}><Ionicons name="shield-checkmark-outline" size={25} color={T.neon} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.name}>Profil Gizliliği</Text><Text style={styles.smallMuted}>{privateProfile ? 'Özel: yalnızca kodla bulunabilirsin' : 'Herkese açık profil'}</Text></View><Switch value={privateProfile} onValueChange={setPrivateProfile} trackColor={{ false: T.border, true: T.violet }} thumbColor={T.white} /></View><View style={styles.divider} /><Text style={styles.smallMuted}>Gizli Profil Kodum:</Text><View style={styles.codeRow}><Text selectable style={styles.profileCode}>{profileCode}</Text><Pressable accessibilityRole="button" accessibilityLabel="Kodu Değiştir" onPress={changeCode} style={styles.codeChange}><Ionicons name="refresh" size={18} color={T.gold} /><Text style={styles.codeChangeText}>Kodu Değiştir</Text></Pressable></View><Text style={styles.codeHelp}>Kod her zaman 12 karakterdir. Özel profilde arkadaşların seni bu kodla bulabilir.</Text></View>
    <Text style={[styles.sectionTitle, { marginTop: 26, marginBottom: 14 }]}>Gönderilerim</Text>{myPosts.length ? myPosts.map(post => <FeedPost key={post.id} post={post} />) : <Text style={styles.mutedText}>Henüz gönderi paylaşmadın.</Text>}
    {connected && <Button title="Çıkış Yap" icon="log-out-outline" variant="outline" onPress={() => authService.signOut().catch(error => Alert.alert('Çıkış başarısız', error.message))} style={{ marginTop: 24 }} />}
  </ScrollView><PhotoPicker visible={picker} title="Profil Fotoğrafını Değiştir" onClose={() => setPicker(false)} onSelect={setOwnAvatar} /></Screen>;
}

function PurchaseScreen() {
  const [selected, setSelected] = useState('medium');
  const packages = [{ id: 'small', coins: 50, price: '₺49,99' }, { id: 'medium', coins: 150, price: '₺119,99', badge: 'POPÜLER' }, { id: 'large', coins: 400, price: '₺249,99' }];
  const pay = Platform.OS === 'ios' ? 'Apple Pay' : Platform.OS === 'android' ? 'Google Pay' : 'Apple / Google Pay';
  return <Screen><ScrollView contentContainerStyle={styles.purchasePage}><View style={styles.purchaseHero}><Ionicons name="diamond" size={52} color={T.gold} /><Text style={styles.title}>Jeton Satın Al</Text><Text style={styles.centerMuted}>Bir paket seç ve yolculuğuna devam et.</Text></View>{packages.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: selected === item.id }} onPress={() => setSelected(item.id)} style={[styles.packageCard, selected === item.id && styles.packageSelected]}><Ionicons name="diamond-outline" size={25} color={T.gold} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.name}>{item.coins} Jeton</Text>{item.badge && <Text style={styles.goldTiny}>{item.badge}</Text>}</View><Text style={styles.packagePrice}>{item.price}</Text></Pressable>)}<Button title={`${pay} ile Devam Et`} icon="card-outline" onPress={() => Alert.alert('Demo ödeme', 'Bu MVP’de gerçek ödeme alınmaz; ödeme entegrasyonu henüz bağlı değildir.')} style={{ marginTop: 20 }} /><Text style={styles.paymentNote}>Paketler ve fiyatlar örnek amaçlıdır.</Text></ScrollView></Screen>;
}

const TAB_ICONS = {
  Akış: ['home', 'home-outline'], 'Fal Bak': ['moon', 'moon-outline'],
  'Story & DM': ['chatbubbles', 'chatbubbles-outline'], Profil: ['person', 'person-outline'],
  'Admin Paneli': ['shield-checkmark', 'shield-checkmark-outline'],
};

function MainTabs() {
  const { role } = useApp();
  return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: T.gold, tabBarInactiveTintColor: T.muted, tabBarStyle: styles.tabBar, tabBarLabelStyle: styles.tabLabel, tabBarIcon: ({ focused, color }) => <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} color={color} size={21} /> })}><Tab.Screen name="Akış" component={FeedScreen} /><Tab.Screen name="Fal Bak" component={ReadingScreen} /><Tab.Screen name="Story & DM" component={StoryDmScreen} /><Tab.Screen name="Profil" component={ProfileScreen} />{role === 'admin' && <Tab.Screen name="Admin Paneli" component={AdminScreen} />}</Tab.Navigator>;
}

function AppNavigator({ session, serverProfile, onServerProfileChange }) {
  return <AppProvider session={session} serverProfile={serverProfile} onServerProfileChange={onServerProfileChange}><NavigationContainer><Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: T.bg }, headerTintColor: T.white, headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: T.bg } }}><Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} /><Stack.Screen name="Story" component={StoryScreen} options={{ headerShown: false, animation: 'fade' }} /><Stack.Screen name="Friends" component={FriendsScreen} options={{ title: 'Arkadaşlar', headerShown: false }} /><Stack.Screen name="FriendProfile" component={FriendProfileScreen} options={{ title: 'Profil' }} /><Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={({ route }) => ({ title: route.params.title })} /><Stack.Screen name="Purchase" component={PurchaseScreen} options={{ title: 'Jeton Mağazası' }} /></Stack.Navigator></NavigationContainer></AppProvider>;
}

function AuthScreen() {
  const [register, setRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const submit = async () => {
    if (!email.trim() || password.length < 6 || (register && username.trim().length < 3)) {
      setNotice('E-posta, en az 6 karakterli şifre ve kayıt için en az 3 karakterli kullanıcı adı gerekli.');
      return;
    }
    setBusy(true); setNotice('');
    try {
      const data = register
        ? await authService.signUp(email, password, username)
        : await authService.signIn(email, password);
      if (register && !data.session) setNotice('Kayıt alındı. E-postana gelen doğrulama bağlantısını aç, ardından giriş yap.');
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  };
  return <Screen><ScrollView contentContainerStyle={styles.authPage} keyboardShouldPersistTaps="handled">
    <View style={styles.authHero}><Ionicons name="moon" size={45} color={T.gold} /><Text style={styles.eyebrow}>MİSTİK DÜNYANA HOŞ GELDİN</Text><Text style={styles.title}>{register ? 'Hesap Oluştur' : 'Giriş Yap'}</Text><Text style={styles.centerMuted}>Fal, story ve sohbetler tek bir yerde.</Text></View>
    <View style={styles.authCard}>{register && <TextInput value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="Kullanıcı adı" placeholderTextColor={T.muted} style={styles.authInput} />}
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="E-posta" placeholderTextColor={T.muted} style={styles.authInput} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete={register ? 'new-password' : 'current-password'} placeholder="Şifre" placeholderTextColor={T.muted} style={styles.authInput} />
      {!!notice && <Text style={styles.authNotice}>{notice}</Text>}
      <Button title={busy ? 'Bekleyin...' : register ? 'Kayıt Ol' : 'Giriş Yap'} icon="sparkles-outline" disabled={busy} onPress={submit} style={{ marginTop: 9 }} />
      <Pressable onPress={() => { setRegister(old => !old); setNotice(''); }} style={styles.authSwitch}><Text style={styles.goldLink}>{register ? 'Zaten hesabım var · Giriş Yap' : 'Hesabım yok · Kayıt Ol'}</Text></Pressable>
    </View>
  </ScrollView></Screen>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [serverProfile, setServerProfile] = useState(null);
  const [loading, setLoading] = useState(backendConfigured);
  const [sessionResolved, setSessionResolved] = useState(!backendConfigured);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!backendConfigured) return;
    let active = true;
    authService.getSession().then(value => { if (active) { setSession(value); setSessionResolved(true); } })
      .catch(problem => { if (active) { setError(problem.message); setSessionResolved(true); setLoading(false); } });
    const subscription = authService.onAuthStateChange(value => { if (active) { setSession(value); setSessionResolved(true); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!backendConfigured || !sessionResolved) return;
    if (!session) { setServerProfile(null); setLoading(false); return; }
    let active = true;
    setLoading(true); setError('');
    profileService.getMine().then(profile => { if (active) setServerProfile(profile); })
      .catch(problem => { if (active) setError(problem.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionResolved, session?.user?.id, retry]);
  if (backendConfigError) return <Screen><View style={styles.authLoading}><Text style={styles.title}>Supabase Ayarı Hatalı</Text><Text style={styles.centerMuted}>{backendConfigError}</Text><Text style={styles.centerMuted}>.env dosyasını düzelttikten sonra Expo'yu yeniden başlat.</Text></View></Screen>;
  if (!backendConfigured) return <AppNavigator />;
  if (loading || (session && serverProfile?.id !== session.user.id && !error)) return <Screen><View style={styles.authLoading}><ActivityIndicator size="large" color={T.neon} /><Text style={styles.centerMuted}>Hesabın yükleniyor...</Text></View></Screen>;
  if (!session) return <AuthScreen />;
  if (error || !serverProfile) return <Screen><View style={styles.authLoading}><Text style={styles.title}>Bağlantı Hatası</Text><Text style={styles.centerMuted}>{error || 'Profil alınamadı.'}</Text><Button title="Yeniden Dene" onPress={() => setRetry(old => old + 1)} style={{ marginTop: 20 }} /><Button title="Çıkış Yap" variant="outline" onPress={() => authService.signOut()} style={{ marginTop: 10 }} /></View></Screen>;
  if (serverProfile.ban_type === 'full_ban') return <Screen><View style={styles.authLoading}><Ionicons name="lock-closed" size={42} color={T.gold} /><Text style={styles.title}>Hesap Banlı</Text><Text style={styles.centerMuted}>Bu hesaba Tam Ban uygulanmış.</Text><Button title="Çıkış Yap" onPress={() => authService.signOut()} style={{ marginTop: 20 }} /></View></Screen>;
  return <AppNavigator session={session} serverProfile={serverProfile} onServerProfileChange={patch => setServerProfile(old => ({ ...old, ...patch }))} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  pressed: { opacity: 0.78 }, disabled: { opacity: 0.55 },
  eyebrow: { color: T.gold, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: T.white, fontSize: 29, fontWeight: '800', marginTop: 6 },
  sectionTitle: { color: T.white, fontSize: 19, fontWeight: '800' },
  name: { color: T.white, fontSize: 15, fontWeight: '800' },
  mutedText: { color: T.muted, fontSize: 13, lineHeight: 20 },
  smallMuted: { color: T.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  centerMuted: { color: T.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  goldTiny: { color: T.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginLeft: 5 },
  goldLink: { color: T.gold, fontSize: 15, fontWeight: '800' },
  photo: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: T.elevated },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.violet },
  avatarInitial: { color: T.white, fontWeight: '800' },
  button: { minHeight: 48, borderRadius: 14, backgroundColor: T.gold, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 13 },
  buttonText: { color: T.bg, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  outlineButton: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.gold },
  subtleButton: { backgroundColor: T.elevated },
  outlineButtonText: { color: T.gold },
  modalShade: { flex: 1, backgroundColor: '#090512bb', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: T.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, maxHeight: '75%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingTop: 15, paddingBottom: 18 },
  photoOption: { width: '31%', marginBottom: 17 },
  photoOptionImage: { width: '100%', aspectRatio: 1, borderRadius: 13 },
  photoOptionLabel: { color: T.white, fontSize: 11, marginTop: 6, textAlign: 'center' },
  feedList: { paddingHorizontal: 18, paddingBottom: 30 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 23, paddingBottom: 28 },
  storyRow: { gap: 15, paddingTop: 13, paddingBottom: 14 },
  storyItem: { width: 70, alignItems: 'center' },
  storyRing: { borderWidth: 2, borderColor: T.neon, borderRadius: 38, padding: 3 },
  storyRingMine: { borderColor: T.border },
  storyPlus: { position: 'absolute', right: 0, top: 49, width: 23, height: 23, borderRadius: 12, backgroundColor: T.gold, borderWidth: 2, borderColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  storyLabel: { color: T.white, fontSize: 11, marginTop: 6, maxWidth: 70, textAlign: 'center' },
  composerCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  composePrompt: { flex: 1, marginHorizontal: 12, backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 11 },
  postCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 21, padding: 15, marginBottom: 14 },
  postAuthor: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  readingBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  postText: { color: T.white, fontSize: 14, lineHeight: 22, marginBottom: 13 },
  postPhoto: { width: '100%', height: 200, borderRadius: 14, marginBottom: 12 },
  postStats: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 11 },
  postActions: { borderTopWidth: 1, borderColor: T.border, flexDirection: 'row', paddingTop: 11 },
  postAction: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, paddingVertical: 4 },
  actionText: { color: T.muted, fontSize: 12, fontWeight: '700' },
  commentsArea: { borderTopWidth: 1, borderColor: T.border, marginTop: 10, paddingTop: 12 },
  comment: { backgroundColor: T.elevated, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  commentAuthor: { color: T.gold, fontSize: 11, fontWeight: '800' },
  commentText: { color: T.white, fontSize: 12, lineHeight: 18, marginTop: 3 },
  commentComposer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  commentInput: { flex: 1, minHeight: 40, borderRadius: 20, backgroundColor: T.elevated, color: T.white, paddingHorizontal: 13, fontSize: 12 },
  composeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderColor: T.border },
  composeBody: { padding: 20 },
  postInput: { color: T.white, fontSize: 18, minHeight: 145, textAlignVertical: 'top', paddingTop: 12 },
  composePhoto: { width: '100%', height: 230, borderRadius: 17, marginBottom: 15 },
  removePhoto: { alignItems: 'center', padding: 14 },
  storyScreen: { backgroundColor: T.surface },
  storyFullPhoto: { ...StyleSheet.absoluteFillObject },
  storyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#14082099' },
  storyProgress: { height: 3, marginHorizontal: 16, marginTop: 13, backgroundColor: T.white, borderRadius: 2 },
  storyTop: { flexDirection: 'row', alignItems: 'center', padding: 17 },
  storyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25 },
  storyText: { color: T.white, fontSize: 25, lineHeight: 36, fontWeight: '800', textAlign: 'center', textShadowColor: '#10091b', textShadowRadius: 8 },
  storyFooter: { color: T.white, textAlign: 'center', fontSize: 11, letterSpacing: 2, paddingBottom: 28 },
  readingPage: { paddingHorizontal: 20, paddingBottom: 30, flexGrow: 1 },
  readingHero: { alignItems: 'center', paddingTop: 35, paddingBottom: 30 },
  moonOrb: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, marginBottom: 18, shadowColor: T.neon, shadowOpacity: 0.4, shadowRadius: 16, elevation: 5 },
  readingChoice: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 20, minHeight: 86, marginBottom: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  readingChoiceIcon: { width: 53, height: 53, borderRadius: 15, backgroundColor: T.elevated, alignItems: 'center', justifyContent: 'center' },
  analysisCard: { minHeight: 315, borderRadius: 23, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', padding: 20 },
  analysisOrb: { width: 95, height: 95, borderRadius: 48, backgroundColor: T.elevated, borderWidth: 1, borderColor: T.neon, alignItems: 'center', justifyContent: 'center', marginBottom: 27 },
  resultCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 22, padding: 21, marginBottom: 15 },
  resultTitle: { color: T.white, fontSize: 24, fontWeight: '800', marginTop: 4 },
  resultText: { color: T.white, fontSize: 15, lineHeight: 25 },
  divider: { height: 1, backgroundColor: T.border, marginVertical: 17 },
  again: { alignItems: 'center', padding: 18 },
  friendsPage: { paddingHorizontal: 18, paddingTop: 23, paddingBottom: 35 },
  friendBack: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 16 },
  searchCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 20, padding: 16, marginTop: 23, marginBottom: 26 },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 13 },
  searchInput: { flex: 1, height: 45, backgroundColor: T.elevated, borderRadius: 13, color: T.white, paddingHorizontal: 12, fontSize: 13 },
  searchButton: { width: 45, height: 45, borderRadius: 13, backgroundColor: T.gold, justifyContent: 'center', alignItems: 'center' },
  codeCounter: { color: T.muted, textAlign: 'right', fontSize: 10, marginTop: 5 },
  searchMessage: { color: T.gold, fontSize: 12, marginTop: 8 },
  friendRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 17, padding: 11, marginBottom: 9 },
  friendIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  friendButtons: { flexDirection: 'row', gap: 5, marginLeft: 5 },
  miniGold: { width: 33, height: 33, borderRadius: 10, backgroundColor: T.gold, alignItems: 'center', justifyContent: 'center' },
  miniOutline: { width: 33, height: 33, borderRadius: 10, borderWidth: 1, borderColor: T.gold, alignItems: 'center', justifyContent: 'center' },
  detailPage: { paddingHorizontal: 18, paddingBottom: 28 },
  profileCover: { height: 140, marginHorizontal: -18, backgroundColor: T.elevated },
  detailAvatar: { marginTop: -43, alignSelf: 'center', borderWidth: 4, borderColor: T.bg, borderRadius: 50 },
  detailName: { color: T.white, fontSize: 25, fontWeight: '800', textAlign: 'center', marginTop: 9 },
  detailButtons: { flexDirection: 'row', gap: 9, marginTop: 24, marginBottom: 27 },
  blocked: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  chatsHeader: { paddingHorizontal: 18, paddingTop: 23 },
  segment: { flexDirection: 'row', padding: 4, backgroundColor: T.surface, borderRadius: 15, marginTop: 20, marginBottom: 15 },
  segmentItem: { flex: 1, minHeight: 39, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { backgroundColor: T.elevated, borderWidth: 1, borderColor: T.border },
  segmentText: { color: T.muted, fontSize: 12, fontWeight: '700' },
  segmentTextSelected: { color: T.white },
  chatList: { paddingHorizontal: 18, paddingBottom: 22 },
  chatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 17, padding: 12, marginBottom: 9 },
  messageList: { flexGrow: 1, padding: 16 },
  bubble: { maxWidth: '82%', borderRadius: 17, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 10 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#674786', borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: T.elevated, borderBottomLeftRadius: 4 },
  falBubble: { backgroundColor: T.goldDark, borderWidth: 1, borderColor: '#a37b53' },
  bubbleTitle: { color: T.gold, fontSize: 14, fontWeight: '800', marginTop: 5 },
  bubbleText: { color: T.white, fontSize: 14, lineHeight: 21 },
  bubbleTime: { color: T.muted, fontSize: 10, alignSelf: 'flex-end', marginTop: 6 },
  chatComposer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1, borderColor: T.border },
  chatInput: { flex: 1, minHeight: 42, maxHeight: 110, borderRadius: 20, backgroundColor: T.surface, color: T.white, paddingHorizontal: 13, paddingVertical: 10 },
  sendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.gold, alignItems: 'center', justifyContent: 'center', marginLeft: 7 },
  profilePage: { paddingHorizontal: 18, paddingBottom: 35 },
  profileHero: { alignItems: 'center', paddingTop: 30, paddingBottom: 20, gap: 7 },
  cameraButton: { width: 29, height: 29, borderRadius: 15, backgroundColor: T.gold, borderWidth: 2, borderColor: T.bg, alignItems: 'center', justifyContent: 'center', marginTop: -25, marginLeft: 65, marginBottom: 8 },
  coinCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.goldDark, borderWidth: 1, borderColor: '#a67b52', borderRadius: 20, padding: 14 },
  coinIcon: { width: 47, height: 47, borderRadius: 14, backgroundColor: '#664a32', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  coinAmount: { color: T.white, fontSize: 27, fontWeight: '800' },
  buyButton: { backgroundColor: T.gold, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 10, alignItems: 'center' },
  buyButtonText: { color: T.bg, fontSize: 11, fontWeight: '800' },
  buyButtonSub: { color: T.bg, fontSize: 9, fontWeight: '700', marginTop: 2 },
  privacyCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 20, padding: 16, marginTop: 19 },
  privacyRow: { flexDirection: 'row', alignItems: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, marginTop: 7 },
  profileCode: { color: T.gold, fontSize: 17, fontWeight: '800', letterSpacing: 0.5, flexShrink: 1 },
  codeChange: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 7 },
  codeChangeText: { color: T.gold, fontSize: 10, fontWeight: '800' },
  codeHelp: { color: T.muted, fontSize: 11, lineHeight: 17, marginTop: 10 },
  purchasePage: { paddingHorizontal: 20, paddingBottom: 30 },
  purchaseHero: { alignItems: 'center', paddingTop: 35, paddingBottom: 28 },
  packageCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 17, minHeight: 76, padding: 15, marginBottom: 11 },
  packageSelected: { backgroundColor: T.goldDark, borderColor: T.gold },
  packagePrice: { color: T.white, fontSize: 15, fontWeight: '800' },
  paymentNote: { color: T.muted, textAlign: 'center', fontSize: 11, marginTop: 15 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 3 },
  titleBadge: { color: T.bg, backgroundColor: T.neon, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, fontSize: 10, fontWeight: '800' },
  penaltyBadge: { color: T.gold, backgroundColor: T.goldDark, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, fontSize: 10, fontWeight: '800' },
  penaltyNotice: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 7, backgroundColor: T.goldDark, borderWidth: 1, borderColor: T.gold, borderRadius: 12, padding: 10, marginTop: 15 },
  penaltyNoticeText: { color: T.gold, fontSize: 12, fontWeight: '800' },
  chatPenalty: { color: T.gold, backgroundColor: T.goldDark, textAlign: 'center', fontSize: 12, padding: 10 },
  storyReply: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 12 },
  storyReplyInput: { flex: 1, minHeight: 42, color: T.white, backgroundColor: '#211134cc', borderWidth: 1, borderColor: T.white, borderRadius: 20, paddingHorizontal: 13 },
  storyDmHeader: { paddingHorizontal: 18, paddingTop: 20 },
  friendShortcut: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start', backgroundColor: T.surface, borderColor: T.border, borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 },
  storyDmContent: { paddingHorizontal: 18, paddingBottom: 30 },
  storyComposer: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 19, padding: 15, marginBottom: 20 },
  storyDraft: { minHeight: 65, color: T.white, fontSize: 14, textAlignVertical: 'top', paddingVertical: 10 },
  storyDraftPhoto: { height: 145, width: '100%', borderRadius: 12, marginBottom: 12 },
  storyComposerActions: { flexDirection: 'row', gap: 8 },
  storyListCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 17, padding: 10, marginBottom: 10 },
  storyListPhoto: { width: 64, height: 64, borderRadius: 11 },
  angleGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16, marginBottom: 24 },
  angleSlot: { width: '23%', aspectRatio: 0.85, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden' },
  anglePhoto: { ...StyleSheet.absoluteFillObject },
  angleLabel: { color: T.white, backgroundColor: '#180b2bbb', fontSize: 10, fontWeight: '800', position: 'absolute', bottom: 0, width: '100%', textAlign: 'center', paddingVertical: 5 },
  expertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 13, marginTop: 10 },
  expertSelected: { borderColor: T.gold, backgroundColor: T.goldDark },
  adminPage: { paddingHorizontal: 18, paddingBottom: 35 },
  adminHeader: { alignItems: 'center', paddingTop: 25, paddingBottom: 20, gap: 7 },
  adminStats: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  adminStat: { flex: 1, alignItems: 'center', backgroundColor: T.surface, borderColor: T.border, borderWidth: 1, borderRadius: 15, padding: 12 },
  adminStatValue: { color: T.gold, fontSize: 23, fontWeight: '800' },
  adminCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 19, padding: 14, marginBottom: 13 },
  adminPerson: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  adminLabel: { color: T.muted, fontSize: 11, fontWeight: '800', marginTop: 10, marginBottom: 7 },
  adminActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  adminChip: { borderWidth: 1, borderColor: T.border, backgroundColor: T.elevated, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  adminChipActive: { borderColor: T.gold, backgroundColor: T.goldDark },
  adminChipText: { color: T.white, fontSize: 10, fontWeight: '800' },
  authPage: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 30 },
  authHero: { alignItems: 'center', marginBottom: 30, gap: 9 },
  authCard: { backgroundColor: T.surface, borderColor: T.border, borderWidth: 1, borderRadius: 22, padding: 20 },
  authInput: { height: 49, backgroundColor: T.elevated, borderRadius: 13, color: T.white, paddingHorizontal: 14, fontSize: 14, marginBottom: 12 },
  authNotice: { color: T.gold, fontSize: 12, lineHeight: 18, marginVertical: 7 },
  authSwitch: { alignItems: 'center', paddingTop: 22, paddingBottom: 4 },
  authLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  tabBar: { backgroundColor: '#211032', borderTopColor: T.border, borderTopWidth: 1, height: 66, paddingTop: 7, paddingBottom: 7 },
  tabLabel: { fontSize: 9, fontWeight: '700' },
});

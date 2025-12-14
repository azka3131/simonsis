// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions 
} from 'react-native';
import { db } from '../firebaseConfig'; 
import { collection, query, where, getDocs } from 'firebase/firestore'; 
import { useRouter } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient'; // Import Gradient

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(compatible && enrolled);
    })();
  }, []);

  const processLogin = async (userEmail, userPass) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('email', '==', userEmail),
        where('password', '==', userPass)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        // Simpan ke Secure Store
        try {
          await SecureStore.setItemAsync('user_email', userEmail);
          await SecureStore.setItemAsync('user_pass', userPass);
        } catch (e) { console.log(e); }

        if (userData.role === 'admin') router.replace('/admin'); 
        else if (userData.role === 'guru') router.replace({ pathname: '/guru', params: { kelas: userData.kelas } });  
        else if (userData.role === 'kepsek') router.replace('/kepsek'); 
      } else {
        Alert.alert('Gagal', 'Email atau Password salah.');
      }
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = () => {
    if (!email || !password) return Alert.alert('Error', 'Isi email dan password!');
    processLogin(email, password);
  };

  const handleBiometricLogin = async () => {
    const savedEmail = await SecureStore.getItemAsync('user_email');
    const savedPass = await SecureStore.getItemAsync('user_pass');
    if (!savedEmail) return Alert.alert('Info', 'Silakan Login Manual sekali dulu.');

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login SiMonSis',
      fallbackLabel: 'Gunakan Password',
    });
    if (result.success) processLogin(savedEmail, savedPass);
  };

  return (
    // Background Gradient (Biru Langit ke Biru Laut)
    <LinearGradient
      colors={['#4c669f', '#3b5998', '#192f6a']}
      style={styles.background}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* LOGO & JUDUL */}
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="school" size={50} color="#3b5998" />
            </View>
            <Text style={styles.title}>SiMonSis</Text>
            <Text style={styles.subtitle}>Sistem Monitoring Siswa</Text>
          </View>

          {/* KARTU FORM LOGIN */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Selamat Datang!</Text>
            
            {/* Input Email */}
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Sekolah"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Input Password */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Kata Sandi"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Tombol Login */}
            <TouchableOpacity style={styles.loginBtn} onPress={handleManualLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginText}>MASUK</Text>
              )}
            </TouchableOpacity>

            {/* Tombol Biometrik */}
            {isBiometricSupported && (
              <TouchableOpacity style={styles.bioBtn} onPress={handleBiometricLogin}>
                <Ionicons name="finger-print" size={24} color="#3b5998" />
                <Text style={styles.bioText}>Masuk dengan Sidik Jari</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.footerText}>© 2025 SDN 03 Tanjunganom</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  iconCircle: {
    width: 100, height: 100, backgroundColor: '#fff', borderRadius: 50,
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5
  },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  subtitle: { fontSize: 16, color: '#e0e0e0', marginTop: 5 },

  card: {
    width: width - 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 8, // Shadow Android
    shadowColor: '#000', // Shadow iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f5f5', borderRadius: 12,
    paddingHorizontal: 15, marginBottom: 15,
    width: '100%', height: 50,
    borderWidth: 1, borderColor: '#eee'
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333' },

  loginBtn: {
    width: '100%', height: 50,
    backgroundColor: '#3b5998', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 10,
    elevation: 3
  },
  loginText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  bioBtn: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 20, padding: 10
  },
  bioText: { color: '#3b5998', marginLeft: 8, fontWeight: '600' },

  footerText: { marginTop: 40, color: 'rgba(255,255,255,0.6)', fontSize: 12 }
});
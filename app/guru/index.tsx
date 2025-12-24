// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  Alert, Linking, ActivityIndicator 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../firebaseConfig'; 
// REVISI: Tambahkan getDoc untuk mengecek data yang sudah ada
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'; 
import { Ionicons } from '@expo/vector-icons';

export default function GuruDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const kelasAktif = params.kelas;

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState({});

  useEffect(() => {
    if (!kelasAktif) return;

    const q = query(
      collection(db, 'students'), 
      where('kelas', '==', kelasAktif), 
      orderBy('nama', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsData);
      
      // --- LOGIKA BARU UNTUK RESTORE DATA ---
      // 1. Tentukan ID Dokumen hari ini
      const today = new Date().toISOString().split('T')[0];
      const customDocID = `${today}_Kelas${kelasAktif}`;
      
      try {
        // 2. Cek ke database apakah sudah pernah absen hari ini?
        const docRef = doc(db, 'attendance_recap', customDocID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().details) {
          // 3A. JIKA ADA: Gabungkan data tersimpan dengan data siswa terbaru
          // (Mengantisipasi jika ada siswa baru masuk tapi belum diabsen)
          const savedAttendance = docSnap.data().details;
          const mergedAttendance = {};

          studentsData.forEach(s => {
            // Pakai data tersimpan jika ada, jika tidak default 'H'
            mergedAttendance[s.id] = savedAttendance[s.id] || 'H';
          });
          
          setAttendanceData(mergedAttendance);
          // Opsional: Beri tahu guru bahwa data lama dimuat
          // Alert.alert("Info", "Data absensi hari ini berhasil dimuat kembali.");
        } else {
          // 3B. JIKA BELUM ADA: Set default semua Hadir (H)
          const initialAbsen = {};
          studentsData.forEach(s => { initialAbsen[s.id] = 'H'; });
          setAttendanceData(initialAbsen);
        }
      } catch (error) {
        console.log("Gagal memuat data lama:", error);
        // Fallback jika error
        const initialAbsen = {};
        studentsData.forEach(s => { initialAbsen[s.id] = 'H'; });
        setAttendanceData(initialAbsen);
      }
      
      setLoading(false);
    });
    return () => unsubscribe();
  }, [kelasAktif]);

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return Alert.alert('Gagal', 'No HP tidak tersedia');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleSelectStatus = (studentId, status) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmitAttendance = async () => {
    Alert.alert('Konfirmasi', `Simpan / Perbarui absensi Kelas ${kelasAktif}?`, [
      { text: 'Batal', style: 'cancel' },
      { 
        text: 'Ya, Simpan', 
        onPress: async () => {
          try {
            let hadir = 0, sakit = 0, izin = 0, alpha = 0;
            Object.values(attendanceData).forEach(status => {
              if (status === 'H') hadir++;
              if (status === 'S') sakit++;
              if (status === 'I') izin++;
              if (status === 'A') alpha++;
            });

            const today = new Date().toISOString().split('T')[0];
            const customDocID = `${today}_Kelas${kelasAktif}`;

            // Gunakan setDoc dengan opsi merge: true agar aman
            await setDoc(doc(db, 'attendance_recap', customDocID), {
              date: today,
              timestamp: Timestamp.now(),
              kelas: kelasAktif,
              total_hadir: hadir,
              total_sakit: sakit,
              total_izin: izin,
              total_alpha: alpha,
              // REVISI: PENTING! Simpan detail per siswa
              details: attendanceData 
            }, { merge: true });

            Alert.alert('Berhasil', 'Data berhasil diperbarui! Siswa terlambat sudah tercatat.');
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        }
      }
    ]);
  };

  const renderStudent = ({ item }) => {
    const status = attendanceData[item.id] || 'H';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.name}>{item.nama}</Text>
            <Text style={styles.info}>NIS: {item.nis}</Text>
          </View>
          <TouchableOpacity onPress={() => handleCall(item.no_hp_ortu)} style={styles.callBtn}>
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.attendanceOptions}>
          {['H', 'S', 'I', 'A'].map((option) => (
            <TouchableOpacity 
              key={option} 
              style={[styles.optionBtn, status === option && styles[`optionSelected${option}`]]}
              onPress={() => handleSelectStatus(item.id, option)}
            >
              <Text style={[styles.optionText, status === option && styles.optionTextSelected]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Guru Kelas {kelasAktif}</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Ionicons name="log-out-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 20 }} />
      ) : (
        <>
          <FlatList
            data={students}
            keyExtractor={item => item.id}
            renderItem={renderStudent}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20}}>Tidak ada siswa di Kelas {kelasAktif}</Text>}
          />
          <View style={styles.footer}>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitAttendance}>
              <Text style={styles.submitText}>SIMPAN / UPDATE ABSENSI</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

// Styles tidak berubah, gunakan yang lama
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { backgroundColor: '#27ae60', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  list: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 2, borderLeftWidth: 5, borderLeftColor: '#27ae60' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  info: { fontSize: 12, color: '#7f8c8d' },
  callBtn: { backgroundColor: '#3498db', padding: 8, borderRadius: 50 },
  attendanceOptions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  optionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff' },
  optionText: { fontWeight: 'bold', color: '#7f8c8d' },
  optionTextSelected: { color: '#fff' },
  optionSelectedH: { backgroundColor: '#27ae60', borderColor: '#27ae60' },
  optionSelectedS: { backgroundColor: '#f1c40f', borderColor: '#f1c40f' },
  optionSelectedI: { backgroundColor: '#3498db', borderColor: '#3498db' },
  optionSelectedA: { backgroundColor: '#e74c3c', borderColor: '#e74c3c' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  submitBtn: { backgroundColor: '#2c3e50', padding: 15, borderRadius: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
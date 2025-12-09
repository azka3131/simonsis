// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  TextInput, Modal, Alert, Vibration, ActivityIndicator, ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../firebaseConfig'; 
// Import updateDoc untuk fitur edit
import { collection, addDoc, updateDoc, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboard() {
  const router = useRouter();
  
  const [allStudents, setAllStudents] = useState([]); 
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [classList, setClassList] = useState(['Semua']); 

  // Modal & Edit State
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null); // Menyimpan ID siswa yang sedang diedit

  // Form State
  const [nama, setNama] = useState('');
  const [nis, setNis] = useState('');
  const [kelas, setKelas] = useState('');
  const [ortu, setOrtu] = useState('');
  const [hp, setHp] = useState('');

  // 1. AMBIL DATA
  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('kelas', 'asc'), orderBy('nama', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllStudents(studentsData);
      const uniqueClasses = [...new Set(studentsData.map(item => item.kelas))];
      uniqueClasses.sort((a, b) => a.toString().localeCompare(b.toString(), undefined, { numeric: true }));
      setClassList(['Semua', ...uniqueClasses]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. FILTERING
  useEffect(() => {
    if (selectedClass === 'Semua') {
      setFilteredStudents(allStudents);
    } else {
      setFilteredStudents(allStudents.filter(item => item.kelas === selectedClass));
    }
  }, [selectedClass, allStudents]);

  // 3. HANDLER UNTUK BUKA MODAL (TAMBAH / EDIT)
  const openModalAdd = () => {
    setEditingId(null); // Mode Tambah
    resetForm();
    setModalVisible(true);
  };

  const openModalEdit = (student) => {
    setEditingId(student.id); // Mode Edit (Simpan ID nya)
    // Isi form dengan data lama
    setNama(student.nama);
    setNis(student.nis);
    setKelas(student.kelas);
    setOrtu(student.nama_ortu);
    setHp(student.no_hp_ortu);
    setModalVisible(true);
  };

  // 4. SIMPAN DATA (BISA ADD ATAU UPDATE)
  const handleSave = async () => {
    if (!nama || !nis || !kelas) {
      Alert.alert('Error', 'Nama, NIS, dan Kelas wajib diisi!');
      return;
    }
    setIsSaving(true);
    try {
      const studentData = { nama, nis, kelas, nama_ortu: ortu, no_hp_ortu: hp };

      if (editingId) {
        // --- LOGIKA UPDATE (EDIT) ---
        await updateDoc(doc(db, 'students', editingId), studentData);
        Alert.alert('Sukses', 'Data berhasil diperbarui!');
      } else {
        // --- LOGIKA CREATE (TAMBAH BARU) ---
        await addDoc(collection(db, 'students'), studentData);
        Alert.alert('Sukses', 'Data baru ditambahkan!');
        setSelectedClass(kelas); 
      }
      
      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 5. HAPUS SISWA
  const handleDelete = (id, namaSiswa) => {
    Vibration.vibrate(100); 
    Alert.alert('Hapus Data', `Hapus ${namaSiswa}?`, [
      { text: 'Batal', style: 'cancel' },
      { 
        text: 'Hapus', style: 'destructive', 
        onPress: async () => {
          await deleteDoc(doc(db, 'students', id));
          Vibration.vibrate([100, 100]);
        }
      }
    ]);
  };

  const resetForm = () => { setNama(''); setNis(''); setKelas(''); setOrtu(''); setHp(''); };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.nama}</Text>
        <Text style={styles.cardSubtitle}>
          <Text style={{fontWeight: 'bold', color: '#2980b9'}}>Kelas {item.kelas}</Text> | NIS: {item.nis}
        </Text>
        <Text style={styles.cardInfo}>Ortu: {item.nama_ortu}</Text>
      </View>
      
      <View style={styles.actionButtons}>
        {/* TOMBOL EDIT (PENSIL) */}
        <TouchableOpacity onPress={() => openModalEdit(item)} style={[styles.iconBtn, {backgroundColor: '#f1c40f'}]}>
          <Ionicons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
        
        {/* TOMBOL DELETE (SAMPAH) */}
        <TouchableOpacity onPress={() => handleDelete(item.id, item.nama)} style={[styles.iconBtn, {backgroundColor: '#e74c3c'}]}>
          <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Data Siswa</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Ionicons name="log-out-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {classList.map((kls, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.filterBtn, selectedClass === kls && styles.filterBtnActive]}
              onPress={() => setSelectedClass(kls)}
            >
              <Text style={[styles.filterText, selectedClass === kls && styles.filterTextActive]}>
                {kls === 'Semua' ? 'Semua Siswa' : `Kelas ${kls}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada data.</Text>}
        />
      )}

      {/* FAB TOMBOL TAMBAH */}
      <TouchableOpacity style={styles.fab} onPress={openModalAdd}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* MODAL FORM */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </Text>
            
            <TextInput style={styles.input} placeholder="Nama Lengkap" value={nama} onChangeText={setNama} />
            <TextInput style={styles.input} placeholder="NIS" value={nis} onChangeText={setNis} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Kelas (Contoh: 1, 2, 6A)" value={kelas} onChangeText={setKelas} />
            <TextInput style={styles.input} placeholder="Nama Ortu" value={ortu} onChangeText={setOrtu} />
            <TextInput style={styles.input} placeholder="No HP" value={hp} onChangeText={setHp} keyboardType="phone-pad" />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Simpan</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ... COPY STYLES DARI KODE ADMIN SEBELUMNYA ...
// Tambahkan style baru untuk tombol aksi:
const styles = StyleSheet.create({
  // ... (Paste semua style lama di sini) ...
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { backgroundColor: '#3498db', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  filterWrapper: { backgroundColor: '#fff', paddingVertical: 10, elevation: 2 },
  filterScroll: { paddingHorizontal: 10 },
  filterBtn: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#ecf0f1', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#bdc3c7' },
  filterBtnActive: { backgroundColor: '#3498db', borderColor: '#3498db' },
  filterText: { color: '#7f8c8d', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  listContainer: { padding: 15, paddingBottom: 100 },
  emptyText: { textAlign: 'center', marginTop: 50, color: 'gray', fontStyle: 'italic' },
  
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#34495e', marginBottom: 2 },
  cardInfo: { fontSize: 12, color: '#95a5a6' },

  // STYLE BARU TOMBOL AKSI
  actionButtons: { flexDirection: 'row', gap: 10 },
  iconBtn: { padding: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  fab: { position: 'absolute', bottom: 25, right: 25, backgroundColor: '#2ecc71', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#34495e' },
  input: { borderWidth: 1, borderColor: '#ecf0f1', backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  btnCancel: { backgroundColor: '#e74c3c' },
  btnSave: { backgroundColor: '#2ecc71' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
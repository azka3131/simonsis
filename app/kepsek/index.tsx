// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, 
  Dimensions, ActivityIndicator, Alert, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../firebaseConfig'; 
import { collection, onSnapshot, query, where } from 'firebase/firestore'; // Pakai 'where', bukan 'orderBy'
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function KepsekDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // STATE PENTING
  const [date, setDate] = useState(new Date()); // Tanggal yang dipilih (Default: Hari Ini)
  const [showPicker, setShowPicker] = useState(false);
  const [selectedClass, setSelectedClass] = useState('1'); 
  
  const [allData, setAllData] = useState([]); 
  const [stats, setStats] = useState({ hadir: 0, sakit: 0, izin: 0, alpha: 0 });

  // Helper format tanggal database (YYYY-MM-DD)
  const formatDateDB = (rawDate) => {
    return rawDate.toISOString().split('T')[0];
  };

  // Helper format tanggal cantik Indonesia
  const formatDateIndo = (rawDate) => {
    return rawDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // 1. AMBIL DATA BERDASARKAN TANGGAL DIPILIH 📅
  useEffect(() => {
    setLoading(true);
    const dateString = formatDateDB(date); // Contoh: "2025-12-20"

    // Query Cerdas: Hanya ambil dokumen yang tanggalnya SAMA dengan pilihan
    const q = query(
      collection(db, 'attendance_recap'), 
      where('date', '==', dateString)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setAllData(data); // Simpan data mentah hari itu
      setLoading(false);
    });

    return () => unsubscribe();
  }, [date]); // Reload kalau tanggal diganti

  // 2. HITUNG STATISTIK (Filter Kelas)
  useEffect(() => {
    let h = 0, s = 0, i = 0, a = 0;

    if (allData.length > 0) {
      // Filter data array berdasarkan kelas yang dipilih slider
      const filteredData = allData.filter(item => String(item.kelas) === String(selectedClass));

      filteredData.forEach(data => {
        h += data.total_hadir || 0;
        s += data.total_sakit || 0;
        i += data.total_izin || 0;
        a += data.total_alpha || 0;
      });
    }
    
    setStats({ hadir: h, sakit: s, izin: i, alpha: a });
  }, [selectedClass, allData]); // Hitung ulang kalau kelas/data berubah

  // Handle Ganti Tanggal
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowPicker(Platform.OS === 'ios'); 
    setDate(currentDate);
  };

  const chartData = [
    { name: 'Hadir', population: stats.hadir, color: '#2ecc71', legendFontColor: '#7f8c8d', legendFontSize: 12 },
    { name: 'Sakit', population: stats.sakit, color: '#f1c40f', legendFontColor: '#7f8c8d', legendFontSize: 12 },
    { name: 'Izin', population: stats.izin, color: '#3498db', legendFontColor: '#7f8c8d', legendFontSize: 12 },
    { name: 'Alpha', population: stats.alpha, color: '#e74c3c', legendFontColor: '#7f8c8d', legendFontSize: 12 },
  ];

  // 3. CETAK PDF SESUAI TANGGAL & KELAS TERPILIH 🖨️
  const handleDownloadPDF = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica'; padding: 20px; }
              h1 { color: #2c3e50; text-align: center; margin-bottom: 5px; }
              h3 { text-align: center; color: #555; margin-top: 0; }
              .info-box { background: #f0f2f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #e67e22; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
              th { background-color: #34495e; color: white; }
              .summary { margin-top: 30px; font-size: 18px; font-weight: bold; text-align: right; color: #2c3e50; }
            </style>
          </head>
          <body>
            <h1>Laporan Absensi Harian</h1>
            <h3>SDN 03 TANJUNGANOM</h3>
            
            <div class="info-box">
              <p><strong>Tanggal:</strong> ${formatDateIndo(date)}</p>
              <p><strong>Kelas:</strong> ${selectedClass}</p>
            </div>
            
            <table>
              <tr>
                <th>Kategori</th>
                <th>Jumlah Siswa</th>
              </tr>
              <tr><td>Hadir</td><td>${stats.hadir}</td></tr>
              <tr><td>Sakit</td><td>${stats.sakit}</td></tr>
              <tr><td>Izin</td><td>${stats.izin}</td></tr>
              <tr><td>Alpha</td><td>${stats.alpha}</td></tr>
            </table>

            <div class="summary">
              Total Siswa Terdata: ${stats.hadir + stats.sakit + stats.izin + stats.alpha}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Selamat Datang, Kepala Sekolah</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Ionicons name="log-out-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* FILTER TANGGAL (DATE PICKER) */}
      <View style={styles.dateContainer}>
        <Text style={styles.sectionLabel}>Pilih Tanggal Laporan:</Text>
        <TouchableOpacity style={styles.dateSelector} onPress={() => setShowPicker(true)}>
          <Ionicons name="calendar" size={20} color="#fff" />
          <Text style={styles.dateText}>{formatDateIndo(date)}</Text>
          <Ionicons name="chevron-down" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onChangeDate}
          maximumDate={new Date()} // Tidak bisa pilih masa depan
        />
      )}

      {/* FILTER KELAS (SLIDER) */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['1', '2', '3', '4', '5', '6'].map((kls) => (
            <TouchableOpacity 
              key={kls}
              style={[styles.filterBtn, selectedClass === kls && styles.filterBtnActive]}
              onPress={() => setSelectedClass(kls)}
            >
              <Text style={[styles.filterText, selectedClass === kls && styles.filterTextActive]}>
                Kelas {kls}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#e67e22" style={{ marginTop: 30 }} />
        ) : (
          <>
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Statistik Kelas {selectedClass}</Text>
              
              {/* Jika data kosong (total 0) */}
              {stats.hadir + stats.sakit + stats.izin + stats.alpha === 0 ? (
                <View style={{padding: 40, alignItems: 'center'}}>
                  <Ionicons name="stats-chart-outline" size={50} color="#ccc" />
                  <Text style={{color: '#999', marginTop: 10, textAlign:'center'}}>
                    Belum ada data absensi{'\n'}pada tanggal ini.
                  </Text>
                </View>
              ) : (
                <PieChart
                  data={chartData}
                  width={Dimensions.get('window').width - 60}
                  height={220}
                  chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"15"}
                  absolute
                />
              )}
            </View>

            {/* DETAIL ANGKA */}
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, {borderLeftColor: '#2ecc71'}]}><Text style={styles.statNum}>{stats.hadir}</Text><Text>Hadir</Text></View>
              <View style={[styles.statBox, {borderLeftColor: '#f1c40f'}]}><Text style={styles.statNum}>{stats.sakit}</Text><Text>Sakit</Text></View>
              <View style={[styles.statBox, {borderLeftColor: '#3498db'}]}><Text style={styles.statNum}>{stats.izin}</Text><Text>Izin</Text></View>
              <View style={[styles.statBox, {borderLeftColor: '#e74c3c'}]}><Text style={styles.statNum}>{stats.alpha}</Text><Text>Alpha</Text></View>
            </View>

            {/* TOMBOL PDF */}
            <TouchableOpacity style={styles.pdfButton} onPress={handleDownloadPDF}>
              <Ionicons name="print-outline" size={24} color="#fff" style={{marginRight: 10}} />
              <Text style={styles.pdfText}>DOWNLOAD LAPORAN (PDF)</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#e67e22', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  dateContainer: { padding: 20, paddingBottom: 0 },
  sectionLabel: { fontSize: 14, color: '#7f8c8d', marginBottom: 8, fontWeight: '600' },
  dateSelector: { backgroundColor: '#d35400', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, elevation: 2 },
  dateText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  filterContainer: { paddingVertical: 15, paddingHorizontal: 20 },
  filterBtn: { paddingHorizontal: 20, paddingVertical: 8, marginRight: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  filterBtnActive: { backgroundColor: '#e67e22', borderColor: '#e67e22' },
  filterText: { color: '#7f8c8d', fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  content: { paddingHorizontal: 20, paddingBottom: 50 },
  chartContainer: { backgroundColor: '#fff', borderRadius: 10, padding: 15, elevation: 2, marginBottom: 20, alignItems: 'center' },
  chartTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { width: '48%', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1, borderLeftWidth: 4, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#333' },

  pdfButton: { backgroundColor: '#34495e', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 10, elevation: 3, marginBottom: 50 },
  pdfText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
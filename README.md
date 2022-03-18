# Inaproc.id/rup Scraper

Ini merupakan tool yang dikembangkan untuk melakukan pembacaan data RUP dari website inaproc.id/rup. Mengapa menggunakan alamat inaproc.id dan bukan langsung dari sirup.lkpp.go.id? Hal ini dikarenakan lambatnya proses loading apabila data diambil langsung dari website sirup.lkpp.go.id.

## Cara Instalasi

- lakukan instalasi yarn di tempat menjalankan tool ini
- kemudian lakukan git clone terhadap repository
- lakukan yarn install di folder project aplikasi tool

## Cara Menjalankan

Setelah proses instalasi selesai tinggal dijalankan script dengan menambahkan alamat inaproc.id/rup yang akan diambil datanya.

Sebagai contoh:

` $ node index.js inaproc.id/rup`

Melakukan filter berdasarkan tahun anggaran dan filter lainnya? Mudah saja, tinggal tambahkan pada query URL ke inaproc.id sesuai dengan filter yang disediakan oleh aplikasi inaproc.id. Lebih mudahnya, akses ke website tersebut kemudian lakukan filter dan copy URL yang ada, kemudian URL ini dijadikan sebagai inputan untuk script scraper. 

Misalnya untuk mendapatkan RUP pada tahun 2022 pada KLPD Pemerintah Provinsi Kalimantan Tengah digunakan URL: `https://inaproc.id/rup?year=2022&kldi=D226`, sehingga script dijalankan dengan cara sebagai berikut.

```bash
$ node index.js "https://inaproc.id/rup?year=2022&kldi=D226"
```

Perhatikan pada bagian URL ditambahkan tanda kutip dua, kalau tidak URL dianggap bukan merupakan suatu kesatuan.

## Hasil

Pada folder yang sama akan ditampilkan file bernama `hasilBaca.db`, yang merupakan file berisikan JSON formatted value.

## Target Berikutnya

Langkah berikutnya secara garis besar menargetkan:

1. Menambahkan halaman maksimal bisa ditambahkan lewat shell argument;
2. Pagu masih tertulis dengan tulisan Rp. dan perlu dihapuskan sehingga hanya memperlihatkan nilai;
3. Menambahkan fungsi untuk membaca .env;
4. Menambahkan fungsi penyimpanan ke format database lainnya yang bisa dibaca oleh frontend;
5. Menambahkan tampilan reporting;
6. Menambahkan fungsi untuk mengambil swakelola dan pengadaan dalam swakelola.
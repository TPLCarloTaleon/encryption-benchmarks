import {
  Image,
  StyleSheet,
  Platform,
  View,
  Text,
  Button,
  Pressable,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import tw from "twrnc";
import { ThemedText } from "@/components/ThemedText";
import { PropsWithChildren, useState } from "react";

import * as FileSystem from "expo-file-system";
import encryptionCryptoUtil from "@/utils/encryption-crypto.util";
import encryptionRnaesUtil from "@/utils/encryption-rnaes.util";
import { Asset } from "expo-asset";

const MB_TO_PDF_PATH = {
  "2.7": Asset.fromModule(require("../../assets/pdf-2-7mb.pdf")),
  "4.4": Asset.fromModule(require("../../assets/pdf-4-4mb.pdf")),
  "16.8": Asset.fromModule(require("../../assets/pdf-16-8mb.pdf")),
};

export default function HomeScreen() {
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [fileSizeMB, setFileSizeMB] = useState<keyof typeof MB_TO_PDF_PATH>("2.7");
  const [key, setKey] = useState("gWJMm5VTEkFmYzMlGNNGhxNQRz1ZMDmkzzkyOkONjYD");
  const [benchmarkRuns, setBenchmarkRuns] = useState<
    {
      key: string;
      fileSize: string;
      library: "crypto-es" | "react-native-aes-crypto";
      encryptionTime: number;
      decryptionTime: number;
    }[]
  >([]);

  function addBenchmarkRuns(
    _key: string,
    fileSize: string,
    library: "crypto-es" | "react-native-aes-crypto",
    encryptionTime: number,
    decryptionTime: number
  ) {
    setBenchmarkRuns([
      ...benchmarkRuns,
      {
        key: _key,
        fileSize: fileSize,
        library: library,
        encryptionTime: encryptionTime,
        decryptionTime: decryptionTime,
      },
    ]);
  }

  async function runCryptoESBenchmark() {
    setRunningBenchmark(true);
    // Download Files first!
    if (!MB_TO_PDF_PATH["16.8"].downloaded || !MB_TO_PDF_PATH["4.4"].downloaded || !MB_TO_PDF_PATH["2.7"].downloaded) {
      await MB_TO_PDF_PATH["2.7"].downloadAsync();
      await MB_TO_PDF_PATH["4.4"].downloadAsync();
      await MB_TO_PDF_PATH["16.8"].downloadAsync();

      console.log("[runCryptoESBenchmark] Downloaded.");
    }

    const sourcePath = MB_TO_PDF_PATH[fileSizeMB].localUri!;
    const encryptedPath = FileSystem.documentDirectory + "my-file.pdf";
    const decryptedPath = FileSystem.documentDirectory + "my-file-decrypted.pdf";

    try {
      // Measure Encryption Time
      let startTime = Date.now();

      await encryptionCryptoUtil.encrypt({
        filePath: sourcePath,
        outputPath: encryptedPath,
        password: key,
      });

      let endTime = Date.now();

      const encryptionTime = endTime - startTime;

      // Measure Decryption Time

      startTime = Date.now();

      await encryptionCryptoUtil.decrypt({
        encryptedPath: encryptedPath,
        outputPath: decryptedPath,
        password: key,
      });

      endTime = Date.now();

      const decryptionTime = endTime - startTime;

      console.log(
        `[runCryptoESBenchmark] Finished Encrypting (${encryptionTime}ms) and Decrypting (${decryptionTime}ms)`
      );

      addBenchmarkRuns(key, fileSizeMB, "crypto-es", encryptionTime, decryptionTime);
    } catch (e: any) {
      Alert.alert("Error", e?.message);
    } finally {
      setRunningBenchmark(false);
    }
  }

  async function runRNAESBenchmark() {
    setRunningBenchmark(true);
    // Download Files first!
    if (!MB_TO_PDF_PATH["16.8"].downloaded || !MB_TO_PDF_PATH["4.4"].downloaded || !MB_TO_PDF_PATH["2.7"].downloaded) {
      await MB_TO_PDF_PATH["2.7"].downloadAsync();
      await MB_TO_PDF_PATH["4.4"].downloadAsync();
      await MB_TO_PDF_PATH["16.8"].downloadAsync();

      console.log("[runRNAESBenchmark] Downloaded.");
    }

    const sourcePath = MB_TO_PDF_PATH[fileSizeMB].localUri!;
    const encryptedPath = FileSystem.documentDirectory + "my-file-rnaes.pdf";
    const decryptedPath = FileSystem.documentDirectory + "my-file-rnaes-decrypted.pdf";

    try {
      // Measure Encryption Time
      let startTime = Date.now();

      await encryptionRnaesUtil.encrypt({
        filePath: sourcePath,
        outputPath: encryptedPath,
        password: key,
      });

      let endTime = Date.now();

      const encryptionTime = endTime - startTime;

      // Measure Decryption Time

      startTime = Date.now();

      await encryptionRnaesUtil.decrypt({
        encryptedPath: encryptedPath,
        outputPath: decryptedPath,
        password: key,
      });

      endTime = Date.now();

      const decryptionTime = endTime - startTime;

      console.log(`[runRNAESBenchmark] Finished Encrypting (${encryptionTime}ms) and Decrypting (${decryptionTime}ms)`);

      addBenchmarkRuns(key, fileSizeMB, "react-native-aes-crypto", encryptionTime, decryptionTime);
    } catch (e: any) {
      Alert.alert("Error", e?.message);
    } finally {
      setRunningBenchmark(false);
    }
  }

  return (
    <View>
      <SafeAreaView />
      <View style={tw`h-5`} />
      <ThemedText type="title" style={tw`m-2`}>
        Benchmarks
      </ThemedText>

      <View style={tw`flex flex-row items-center gap-x-1 p-2`}>
        <Text>Document Directory:</Text>
        <TextInput value={FileSystem.documentDirectory ?? ""} style={tw`w-52 border p-2 rounded-md`} />
      </View>

      <View style={tw`h-5`} />

      <View style={tw`border p-2 flex-row gap-x-5 m-2`}>
        <View>
          <ThemedText>File Size (Current: {fileSizeMB}MB)</ThemedText>
          <View style={tw`h-5`} />

          <View style={tw`flex flex-row gap-x-5`}>
            <BenchmarkButton
              onPress={() => {
                setFileSizeMB("2.7");
              }}
            >
              2.7MB
            </BenchmarkButton>
            <BenchmarkButton
              onPress={() => {
                setFileSizeMB("4.4");
              }}
            >
              4.4MB
            </BenchmarkButton>
            <BenchmarkButton
              onPress={() => {
                setFileSizeMB("16.8");
              }}
            >
              16.8MB
            </BenchmarkButton>
          </View>
        </View>

        <View style={tw`w-[1px] bg-black h-full`} />

        <View>
          <ThemedText>Key Length ({key.length} character count)</ThemedText>
          <View style={tw`h-5`} />

          <View style={tw`flex flex-row gap-x-5`}>
            <BenchmarkButton
              onPress={() => {
                setKey("123456789123");
              }}
            >
              12 chars
            </BenchmarkButton>
            <BenchmarkButton
              onPress={() => {
                setKey("123456789123123456789123");
              }}
            >
              24 chars
            </BenchmarkButton>
            <BenchmarkButton
              onPress={() => {
                setKey("gWJMm5VTEkFmYzMlGNNGhxNQRz1ZMDmkzzkyOkONjYD");
              }}
            >
              43 chars
            </BenchmarkButton>
          </View>
        </View>

        <View style={tw`w-[1px] bg-black h-full`} />

        <View>
          <ThemedText>Reset Data</ThemedText>
          <View style={tw`h-5`} />
          <BenchmarkButton
            onPress={() => {
              setBenchmarkRuns([]);
            }}
          >
            Reset
          </BenchmarkButton>
        </View>
      </View>

      {/* Library: */}
      <View style={tw`p-2 border m-2`}>
        <ThemedText>Library</ThemedText>
        <View style={tw`h-3`} />
        <View style={tw`flex gap-5 flex-row`}>
          <View style={tw`gap-3`}>
            <ThemedText>crypto-es (Javascript)</ThemedText>
            <BenchmarkButton
              loading={runningBenchmark}
              onPress={() => {
                runCryptoESBenchmark();
              }}
            >
              <ThemedText>Run</ThemedText>
            </BenchmarkButton>
          </View>

          <View style={tw`w-[1px] h-full bg-black`} />

          <View style={tw`gap-3`}>
            <ThemedText>react-native-aes-crypto (Native)</ThemedText>
            <BenchmarkButton
              loading={runningBenchmark}
              onPress={() => {
                runRNAESBenchmark();
              }}
            >
              <ThemedText>Run</ThemedText>
            </BenchmarkButton>
          </View>
        </View>
      </View>

      <View style={tw`h-5`} />

      <View style={tw`border p-2 m-2`}>
        <ThemedText>Runs</ThemedText>

        <View style={tw`h-2`}></View>

        <View>
          {benchmarkRuns?.map((_run, index) => (
            <ThemedText>
              {_run.library} | Key Size: {_run.key.length} | {_run.fileSize}MB | Encryption Time: {_run.encryptionTime}
              ms | Decryption Time: {_run.decryptionTime}ms
            </ThemedText>
          ))}
        </View>
      </View>

      <View style={tw`h-5`} />
    </View>
  );
}

function BenchmarkButton(props: PropsWithChildren & { onPress?: () => void; loading?: boolean }) {
  return (
    <TouchableOpacity
      style={[tw`p-5 bg-red-500 rounded-md flex flex-row gap-x-2`, props?.loading && tw`opacity-50`]}
      onPress={props?.onPress}
      disabled={props?.loading}
    >
      {props?.loading && <ActivityIndicator style={tw`ml-2`} color="white" />}
      <ThemedText style={tw`text-white`}>{props?.children}</ThemedText>
    </TouchableOpacity>
  );
}

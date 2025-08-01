import { useRouter } from "expo-router";
import { onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { auth, db } from "../../firebase";

type CheckInEntry = {
  id: string;
  uid: string;
  muscleGroup?: string;
  timestamp?: number;
};

type UsersMap = {
  [uid: string]: {
    name: string;
    role?: string;
  };
};

export default function AdminScreen() {
  const user = auth.currentUser;
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([]);
  const [users, setUsers] = useState<UsersMap>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const userRef = ref(db, `users/${user.uid}`);
    onValue(userRef, (snapshot) => {
      const userData = snapshot.val();
      setIsAdmin(userData?.role === "admin");
    });

    const checkInsRef = ref(db, "check-ins");
    const unsubscribeCheckIns = onValue(checkInsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entries: CheckInEntry[] = Object.entries(data).map(
          ([id, details]: [string, any]) => ({
            id,
            ...details,
          })
        );
        const sorted = entries.sort(
          (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
        );
        setCheckIns(sorted);
      } else {
        setCheckIns([]);
      }
    });

    const usersRef = ref(db, "users");
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      setUsers(data);
    });

    return () => {
      unsubscribeCheckIns();
      unsubscribeUsers();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      Alert.alert("👋 Logged Out", "You have been signed out.");
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const renderItem = ({ item }: { item: CheckInEntry }) => {
    const name =
      item.uid && users[item.uid]?.name ? users[item.uid].name : "Unknown";

    return (
      <View style={styles.row}>
        <Text style={styles.cell}>{name}</Text>
        <Text style={styles.cell}>{item.muscleGroup || "N/A"}</Text>
        <Text style={styles.cell}>
          {item.timestamp
            ? new Date(item.timestamp).toLocaleString()
            : "N/A"}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🔐 Admin Dashboard</Text>

      {checkIns.length === 0 ? (
        <Text style={styles.emptyText}>No check-ins found.</Text>
      ) : (
        <ScrollView horizontal>
          <View style={styles.table}>
            <View style={styles.header}>
              <Text style={[styles.cell, styles.headerCell]}>Name</Text>
              <Text style={[styles.cell, styles.headerCell]}>Muscle Group</Text>
              <Text style={[styles.cell, styles.headerCell]}>Time</Text>
            </View>

            <FlatList
              data={checkIns}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>
      )}

      {user && isAdmin && (
        <View style={styles.logoutButton}>
          <Button title="🚪 Logout" onPress={handleLogout} color="#d9534f" />
        </View>
      )}
    </ScrollView>
  );
}

const screenWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  table: {
    minWidth: screenWidth * 0.98,
  },
  header: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 6,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    paddingVertical: 8,
  },
  cell: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 8,
    textAlign: "left",
  },
  headerCell: {
    fontWeight: "bold",
    fontSize: 15,
  },
  emptyText: {
    fontStyle: "italic",
    color: "#888",
    marginTop: 20,
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 40,
    width: "100%",
  },
});

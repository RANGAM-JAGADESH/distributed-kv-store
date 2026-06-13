import json
import os


class KeyValueStore:

    def __init__(self):
        self.file_name = "storage.json"
        self.data = self.load_data()

    def load_data(self):
        if os.path.exists(self.file_name):
            with open(self.file_name, "r") as file:
                return json.load(file)
        return {}

    def save_data(self):
        with open(self.file_name, "w") as file:
            json.dump(self.data, file, indent=4)

    def set(self, key, value):
        self.data[key] = value
        self.save_data()

    def get(self, key):
        return self.data.get(key)

    def delete(self, key):
        if key in self.data:
            del self.data[key]
            self.save_data()
            return True
        return False


store = KeyValueStore()
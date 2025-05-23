# kudos_app/views/test_import_data.py

import unittest
from django.test import TestCase
from django.contrib.gis.geos import Point
from kudos_app.models import User, Capsule
from .import_data import create_capsule_from_file, import_data
import streamlit as st
from unittest.mock import patch, MagicMock

class ImportDataTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(
            alias="test_user",
            ubicacion=Point(-3.7038, 40.4168)
        )

    @patch("geopy.geocoders.Nominatim.geocode")
    def test_create_capsule_from_file(self, mock_geocode):
        # Simular la geolocalización
        mock_location = MagicMock()
        mock_location.latitude = 40.4168
        mock_location.longitude = -3.7038
        mock_geocode.return_value = mock_location

        capsule = create_capsule_from_file(self.user, "test.mp4", "Historia Local")
        self.assertEqual(capsule.parameters["type"], "video")
        self.assertEqual(capsule.parameters["themes"], ["Historia Local"])
        self.assertEqual(capsule.parameters["merits"], 5)

    @patch("streamlit.file_uploader")
    @patch("streamlit.text_input")
    @patch("streamlit.button")
    @patch("zipfile.ZipFile")
    @patch("os.listdir")
    @patch("os.path.isfile")
    def test_import_data(self, mock_isfile, mock_listdir, mock_zipfile, mock_button, mock_text_input, mock_file_uploader):
        # Simular entrada del formulario
        mock_file_uploader.return_value = MagicMock(getbuffer=lambda: b"dummy zip content")
        mock_text_input.return_value = "Historia Local"
        mock_button.return_value = True

        # Simular el archivo ZIP y su contenido
        mock_zip = MagicMock()
        mock_zipfile.return_value.__enter__.return_value = mock_zip
        mock_zip.extractall.side_effect = lambda _: None
        mock_listdir.return_value = ["test.mp4"]
        mock_isfile.return_value = True

        new_capsules = import_data(self.user)
        self.assertEqual(len(new_capsules), 1)
        self.assertEqual(new_capsules[0].parameters["type"], "video")
        self.assertEqual(new_capsules[0].parameters["themes"], ["Historia Local"])
        self.assertEqual(new_capsules[0].parameters["merits"], 5)

if __name__ == '__main__':
    unittest.main()
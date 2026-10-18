import unittest
from server.app import Handler, ApiError

class AssetTests(unittest.TestCase):
    def test_svg_assets_have_correct_mime_and_traversal_is_denied(self):
        handler=Handler.__new__(Handler)
        results=[]
        handler.respond=lambda status,body,mime:results.append((status,body,mime))
        for asset in ['bg-room-svg','char-01-desert','char-10-hive']:
            handler.static('/assets/nulls/'+asset+'.svg')
            status,body,mime=results[-1]
            self.assertEqual(status,200)
            self.assertTrue(mime.startswith('image/svg+xml'))
            self.assertTrue(body.startswith(b'<svg'))
        with self.assertRaises(ApiError):handler.static('/assets/nulls/../../server/app.py')

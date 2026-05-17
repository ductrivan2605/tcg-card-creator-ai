import unittest

import numpy as np

from app.services.simulation.metrics import shannon_entropy, win_rate_std


class SimulationMetricTests(unittest.TestCase):
    def test_win_rate_std(self):
        value = win_rate_std(np.array([0.5, 0.5, 0.5]))
        self.assertEqual(0.0, value)

    def test_entropy(self):
        value = shannon_entropy(np.array([0.5, 0.5]))
        self.assertAlmostEqual(1.0, value, places=5)


if __name__ == '__main__':
    unittest.main()

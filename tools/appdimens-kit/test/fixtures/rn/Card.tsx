import { View, Text } from 'react-native';
import { createDimenStyles, sdp, ssp, sdpPx } from 'appdimens-react-native';

const useStyles = createDimenStyles(() => ({
  card: { padding: 16, borderRadius: sdp(12), flex: 1 },
  title: { fontSize: ssp(18) },
  bad: { fontSize: sdpPx(14) },
  auto: { margin: asdp(8) },
  line: { height: 1 },
}));

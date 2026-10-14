import 'package:appdimens_flutter/appdimens.dart';

Widget build(BuildContext context) {
  return Padding(
    padding: EdgeInsets.all(16),
    child: Column(children: [
      Text('Hi', style: TextStyle(fontSize: 18)),
      SizedBox(height: 16.sdp),
      Container(padding: EdgeInsets.symmetric(horizontal: 16.asdp)),
      Divider(height: 1),
    ]),
  );
}

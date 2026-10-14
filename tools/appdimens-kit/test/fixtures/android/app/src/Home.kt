package com.acme.home

import com.appdimens.dynamic.compose.*
import com.appdimens.dynamic.compose.auto.asdp

@Composable
fun Home() {
    Column(Modifier.padding(16.dp)) {                 // raw-unit
        Text("Hi", fontSize = 18.sp)                  // raw-unit (text)
        HorizontalDivider(thickness = 1.dp)           // hairline: below threshold
        Spacer(Modifier.height(24.dp)) // ad:fixed design-system spacer
        Box(Modifier.padding(16.asdp))                // auto: imported, module missing → warning
        Box(Modifier.padding(16.fsdp))                // fluid: not imported → error
        Box(Modifier.padding(16.sdp))                 // ok
        val legacy = 16.balanced().dp                 // obsolete
    }
}

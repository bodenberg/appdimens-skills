import SwiftUI
import AppDimens

struct Home: View {
    var body: some View {
        VStack(spacing: 12) {
            Text("Hi").font(.system(size: 17))
            Text("Ok").font(.system(size: 17.ssp)).padding(16.sdp)
            Rectangle().frame(height: 1)
            Text("Auto").padding(16.asdp)
        }
        .padding(16)
    }
}

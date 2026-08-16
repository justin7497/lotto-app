/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.ljh.sowonlotto;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

public class Application extends android.app.Application {

  @Override
  public void onCreate() {
    super.onCreate();
    ensurePushChannels();
  }

  private void ensurePushChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }
    NotificationManager manager = getSystemService(NotificationManager.class);
    if (manager == null) {
      return;
    }
    createChannelIfMissing(
            manager,
            SowonFirebaseMessagingService.CHANNEL_ID,
            "추첨·번호 안내",
            NotificationManager.IMPORTANCE_HIGH);
    createChannelIfMissing(
            manager,
            SowonFirebaseMessagingService.CHANNEL_ID_V2,
            "앱 알림",
            NotificationManager.IMPORTANCE_HIGH);
  }

  private void createChannelIfMissing(
          NotificationManager manager, String id, String name, int importance) {
    if (manager.getNotificationChannel(id) != null) {
      return;
    }
    NotificationChannel channel = new NotificationChannel(id, name, importance);
    channel.setDescription("소원로또 추첨·번호 안내 알림");
    manager.createNotificationChannel(channel);
  }
}

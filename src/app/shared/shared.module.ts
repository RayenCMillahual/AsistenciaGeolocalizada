import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HeaderComponent } from './header/header.component';
import { LoadingComponent } from './loading/loading.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    HeaderComponent,
    LoadingComponent
  ],
  exports: [
    HeaderComponent,
    LoadingComponent
  ]
})
export class SharedModule {}
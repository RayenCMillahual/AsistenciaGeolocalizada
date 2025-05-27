import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { DateFormatPipe } from '../pipes/date-format.pipe';
import { TimeFormatPipe } from '../pipes/time-format.pipe';

@NgModule({
  imports: [  // Move pipes to imports instead of declarations
    CommonModule,
    IonicModule,
    DateFormatPipe,
    TimeFormatPipe
  ],
  exports: [
    DateFormatPipe,
    TimeFormatPipe,
    CommonModule,
    IonicModule
  ]
})
export class SharedModule { }
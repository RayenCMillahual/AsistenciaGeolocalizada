import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class LoadingComponent {
  @Input() message: string = 'Cargando...';
  @Input() show: boolean = false;
}
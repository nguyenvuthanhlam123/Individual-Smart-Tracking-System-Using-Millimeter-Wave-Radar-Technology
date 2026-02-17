function Kalman4Tracking
% Tracking demonstration using the Kalman filtering algorithm.
%
% Written for ES 658, by Vijay Parsa, March 2005.
%
%

clear

F1 = [1 0 1 0; 0 1 0 1; 0 0 1 0; 0 0 0 1]; %transition matrix

F=F1;


C = [1 0 0 0;0 1 0 0]; %measurement matrix

% ---- Read measurement data from Excel ----
data = readmatrix('RMSE before Kalman _ Obstacle, Music.xlsx');

x_mean = data(:,2)';   % column B
y_mean = data(:,3)';   % column C
x_meas  = data(:,4)';   % column D
y_meas  = data(:,5)';   % column E
Q2 = 4*eye(2);
sigma_a = 0.04;
Q1 = sigma_a * [ ...
    1/4 0   1/2 0;
    0   1/4 0   1/2;
    1/2 0   1   0;
    0   1/2 0   1];

 %Phương sai của v1
%measurement noise variance %Phương sai của v2
N = length(x_mean);

% Measurement vector (radar)
y = [x_mean; y_mean];

% True/reference (chỉ dùng để vẽ)
x = zeros(4, N);
x(1,:) = x_meas;
x(2,:) = y_meas;



% Now let's use the Kalman filter to track the state.

%initial estimate of the state
vx0=x_mean(2)-x_mean(1);
vy0=y_mean(2)-y_mean(1);
xhat(:,1) = [x_mean(1);
             y_mean(1);
             vx0;
             vy0];
%Initial estimate of the filtered error correlation matrix
Kn = diag([10^2, 10^2, 1^2, 1^2]);
% rất tin x,y ban đầu, ít tin vận tốc

%onto Kalman filtering

for i = 1:N
    G = F * Kn * C' * inv(C*Kn*C' + Q2);
    alpha(:,i) = y(:,i) - C*xhat(:,i);
    xhat(:,i+1) = F*xhat(:,i) + G*alpha(:,i);
    myx(:,i)=F*xhat(:,i+1);
    K = Kn - F * G * C * Kn;
    Kn = F * K * F' + Q1;
end;
disp('   i        x_hat        y_hat')
disp('--------------------------------')
for i = 1:size(xhat,2)
    fprintf('%4d   %10.4f   %10.4f\n', i, xhat(1,i), xhat(2,i));
end

figure;
clf
hold on; box on;

% Measured trajectory (đổi sang xanh dương đậm)
plot(x_meas, y_meas, '-', ...
    'Color', [0 0.4470 0.7410], ...   % Blue
    'LineWidth', 2)

% Mean points (giữ marker ngôi sao, không nối đường)
plot(x_mean, y_mean, 'p', ...
    'MarkerSize', 9, ...
    'MarkerFaceColor', 'k', ...
    'MarkerEdgeColor', 'k')

% Kalman estimated trajectory (đổi sang cam / đỏ nhạt)
plot(xhat(1,:), xhat(2,:), '-', ...
    'Color', [0.8500 0.3250 0.0980], ... % Orange
    'LineWidth', 2)

% --- Đánh số thứ tự cho các điểm Estimated ---
for i = 1:size(xhat,2)
    text(xhat(1,i), xhat(2,i), sprintf('%d', i), ...
        'FontSize', 8, ...
        'Color', [0.8500 0.3250 0.0980], ...
        'VerticalAlignment','bottom', ...
        'HorizontalAlignment','right');
end

xlabel('x position')
ylabel('y position')
title('Kalman estimation of position')
legend('Actual','Measured','Kalman Estimated')
grid on
hold off
